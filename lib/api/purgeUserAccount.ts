import mongoose, { Types } from 'mongoose';
import { ApiKey } from '@/models/ApiKey';
import { WebhookEndpoint } from '@/models/WebhookEndpoint';
import { Notification } from '@/models/Notification';
import { ActivityEvent } from '@/models/ActivityEvent';
import { Achievement } from '@/models/Achievement';
import { Follow } from '@/models/Follow';
import { VersusStats } from '@/models/VersusStats';
import { CardResult } from '@/models/CardResult';
import { StudySession } from '@/models/StudySession';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { Classroom } from '@/models/Classroom';
import { Team } from '@/models/Team';
import { Assignment } from '@/models/Assignment';
import { School } from '@/models/School';
import { RevenueEvent } from '@/models/RevenueEvent';
import { CashAppPayment } from '@/models/CashAppPayment';
import { ApiUsage } from '@/models/ApiUsage';
import { ApiLog } from '@/models/ApiLog';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import { Challenge } from '@/models/Challenge';
import { ShareEvent } from '@/models/ShareEvent';
import { ABTestEvent } from '@/models/ABTestEvent';
import { ContentFlag } from '@/models/ContentFlag';
import { CouponTracker } from '@/models/CouponTracker';
import { Invitation } from '@/models/Invitation';
import { EmailCampaign } from '@/models/EmailCampaign';
import { ExternalStudentCardState } from '@/models/ExternalStudentCardState';
import { Promotion } from '@/models/Promotion';
import { User } from '@/models/User';

export interface AccountPurgeMeta {
  requestId: string;
  requesterIp: string;
}

export interface AccountPurgeResult {
  // Rows removed from the database.
  deletedRecordCount: number;
  // Rows kept for tax/fraud/audit but stripped of the link to this person.
  anonymizedRecordCount: number;
  // Classroom/team/assignment documents the user was pulled out of. The
  // container itself survives.
  membershipsPulled: number;
  byCollection: Record<string, number>;
}

// Financial and security rows point here instead of at a real user once the
// account is gone. It satisfies `required` foreign keys without resolving to a
// User document, which is the whole point.
export const DELETED_USER_TOMBSTONE = new Types.ObjectId('000000000000000000000000');

// Stands in for a display name that was copied onto another document at write
// time, such as a challenge leaderboard row. The row has to keep a name for the
// scoreboard to render; it does not have to keep this person's name.
export const DELETED_USER_DISPLAY_NAME = 'Deleted user';

// How long a soft-deleted account sits before the cron erases it. Long enough
// to cover an angry-at-2am deletion and a support ticket about it.
export const ACCOUNT_GRACE_PERIOD_DAYS = 30;

// Deletion receipts live in their own collection. CascadePurgeLog is not reused
// here: it is keyed on (apiKeyId, childId) and requires an apiKeyId, which a
// self-serve account deletion has no equivalent of.
export const ACCOUNT_DELETION_LOG_COLLECTION = 'account_deletion_logs';

// Collections whose rows survive a deletion request with the user reference
// removed. Everything else the user owns is deleted outright. Keys here are
// excluded from `deletedRecordCount`, which counts destroyed rows only.
const RETAINED_COLLECTIONS = [
  'revenue_events',
  'cash_app_payments',
  'auth_logs',
  'api_usage',
  'api_logs',
  'classrooms_archived',
  'conversations',
  'messages',
  'challenges',
  'share_events',
  'ab_test_events',
  'content_flags',
  'coupon_trackers',
  'invitations',
  'email_campaigns',
  'promotions',
  'external_student_card_states',
  'users_referral',
] as const;

// Erase a single user account and everything derived from it.
//
// The split below is the load-bearing part of this function, so it is spelled
// out rather than left to the reader:
//
//   (a) DELETE — the account's own learning content and activity. Sets,
//       sessions, card results, analytics, achievements, activity feed,
//       notifications, follows, versus stats, API keys and their webhook
//       endpoints, profiles, and the User row.
//
//   (b) ANONYMIZE AND RETAIN — financial, security, support, and operational
//       records. RevenueEvent and CashAppPayment back tax filings and
//       chargeback defense; auth_logs backs brute-force and account-takeover
//       investigation; ApiUsage feeds overage billing; ApiLog is the request
//       log; Conversation and Message are support threads whose admin half is
//       the business's own record. Those obligations outlive an erasure
//       request, so the row stays and the link to the person is cut instead
//       (null the ref where the field is optional, DELETED_USER_TOMBSTONE
//       where it is required, direct identifiers blanked).
//
//   (c) $PULL MEMBERSHIP — classrooms, teams, schools, and assignments the
//       user belonged to but does not own. Removing a member must never delete
//       the container, because the container holds other people's data.
//
//   (d) ARCHIVE OWNED CONTAINERS — a classroom whose teacher deletes their
//       account is archived, not deleted, and its students stay in it. The
//       classroom's `teacherId` is deliberately left pointing at the gone
//       account: it is the only breadcrumb an admin has for reassigning the
//       room to a new teacher without guessing.
//
// Order matters. Outbound credentials and webhook targets go first so nothing
// can authenticate or fire mid-deletion, then derived rows, then owned
// content, then the User row, then the receipt.
//
// No Mongo transaction: the Atlas free tier is not guaranteed to be a replica
// set. Every step is idempotent, so a partial failure leaves orphans that the
// next run sweeps.
export async function purgeUserAccount(
  userId: Types.ObjectId | string,
  meta: AccountPurgeMeta,
): Promise<AccountPurgeResult> {
  const requestedAt = new Date();
  const userObjId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const byCollection: Record<string, number> = {};
  let membershipsPulled = 0;

  // --- (a) DELETE ---------------------------------------------------------

  // Step 1: outbound credentials and webhook targets. Killing these first
  // means no key can authenticate as this user and no endpoint can receive a
  // payload while the rest of the purge is running.
  const apiKeys = await ApiKey.find({ userId: userObjId }, { _id: 1 })
    .lean<Array<{ _id: Types.ObjectId }>>();
  const apiKeyIds = apiKeys.map((key) => key._id);

  if (apiKeyIds.length > 0) {
    const endpointsResult = await WebhookEndpoint.deleteMany({ apiKeyId: { $in: apiKeyIds } });
    byCollection.webhook_endpoints = endpointsResult.deletedCount ?? 0;
  } else {
    byCollection.webhook_endpoints = 0;
  }

  const apiKeysResult = await ApiKey.deleteMany({ userId: userObjId });
  byCollection.api_keys = apiKeysResult.deletedCount ?? 0;

  // Step 2: notifications addressed to this user.
  const notificationsResult = await Notification.deleteMany({ userId: userObjId });
  byCollection.notifications = notificationsResult.deletedCount ?? 0;

  // Step 3: follow edges in both directions. The counters on the users who
  // remain are decremented first, otherwise every one of them shows a phantom
  // follower forever. The `$gt: 0` guard keeps a double run from going negative.
  const following = await Follow.find({ followerId: userObjId }, { followingId: 1 })
    .lean<Array<{ followingId: Types.ObjectId }>>();
  const followers = await Follow.find({ followingId: userObjId }, { followerId: 1 })
    .lean<Array<{ followerId: Types.ObjectId }>>();

  if (following.length > 0) {
    await User.updateMany(
      { _id: { $in: following.map((f) => f.followingId) }, followersCount: { $gt: 0 } },
      { $inc: { followersCount: -1 } },
    );
  }
  if (followers.length > 0) {
    await User.updateMany(
      { _id: { $in: followers.map((f) => f.followerId) }, followingCount: { $gt: 0 } },
      { $inc: { followingCount: -1 } },
    );
  }

  const followsResult = await Follow.deleteMany({
    $or: [{ followerId: userObjId }, { followingId: userObjId }],
  });
  byCollection.follows = followsResult.deletedCount ?? 0;

  // Step 4: activity feed, achievements, versus stats.
  const activityResult = await ActivityEvent.deleteMany({ userId: userObjId });
  byCollection.activity_events = activityResult.deletedCount ?? 0;

  const achievementsResult = await Achievement.deleteMany({ userId: userObjId });
  byCollection.achievements = achievementsResult.deletedCount ?? 0;

  const versusResult = await VersusStats.deleteMany({ userId: userObjId });
  byCollection.versus_stats = versusResult.deletedCount ?? 0;

  // Step 5: card results are joined to the user only through the session, so
  // the session ids have to be collected before the sessions are deleted.
  const sessions = await StudySession.find({ userId: userObjId }, { sessionId: 1 })
    .lean<Array<{ sessionId?: string }>>();
  const sessionIds = sessions
    .map((s) => s.sessionId)
    .filter((id): id is string => Boolean(id));

  if (sessionIds.length > 0) {
    const cardResults = await CardResult.deleteMany({ sessionId: { $in: sessionIds } });
    byCollection.card_results = cardResults.deletedCount ?? 0;
  } else {
    byCollection.card_results = 0;
  }

  const sessionsResult = await StudySession.deleteMany({ userId: userObjId });
  byCollection.study_sessions = sessionsResult.deletedCount ?? 0;

  // Step 6: sets and analytics hang off the profile, not the user, so the
  // profile ids come first and the set ids come from those.
  const profiles = await Profile.find({ user: userObjId }, { _id: 1 })
    .lean<Array<{ _id: Types.ObjectId }>>();
  const profileIds = profiles.map((p) => p._id);

  let setIds: Types.ObjectId[] = [];
  if (profileIds.length > 0) {
    const sets = await FlashcardSet.find({ profile: { $in: profileIds } }, { _id: 1 })
      .lean<Array<{ _id: Types.ObjectId }>>();
    setIds = sets.map((s) => s._id);

    const analyticsResult = await StudyAnalytics.deleteMany({ profile: { $in: profileIds } });
    byCollection.study_analytics = analyticsResult.deletedCount ?? 0;
  } else {
    byCollection.study_analytics = 0;
  }

  // --- (c) $PULL MEMBERSHIP ----------------------------------------------

  // Step 7: unshare the sets before deleting them, so no classroom or team is
  // left holding a reference to a set that no longer exists. This edits the
  // container's array only. The container survives.
  if (setIds.length > 0) {
    const classroomSets = await Classroom.updateMany(
      { sharedSets: { $in: setIds } },
      { $pull: { sharedSets: { $in: setIds } } },
    );
    const teamSets = await Team.updateMany(
      { sharedSets: { $in: setIds } },
      { $pull: { sharedSets: { $in: setIds } } },
    );
    membershipsPulled += (classroomSets.modifiedCount ?? 0) + (teamSets.modifiedCount ?? 0);
  }

  // Step 8: the sets and the profiles that own them.
  if (setIds.length > 0) {
    const setsResult = await FlashcardSet.deleteMany({ _id: { $in: setIds } });
    byCollection.flashcard_sets = setsResult.deletedCount ?? 0;
  } else {
    byCollection.flashcard_sets = 0;
  }

  const profilesResult = await Profile.deleteMany({ user: userObjId });
  byCollection.profiles = profilesResult.deletedCount ?? 0;

  // Step 9: memberships in containers owned by other people. A classroom
  // loses a student, a team loses a member, an assignment loses an assignee.
  // None of those documents is deleted.
  const classroomMembership = await Classroom.updateMany(
    { students: userObjId },
    { $pull: { students: userObjId } },
  );
  membershipsPulled += classroomMembership.modifiedCount ?? 0;

  const teamMembership = await Team.updateMany(
    { 'members.userId': userObjId },
    { $pull: { members: { userId: userObjId } } },
  );
  membershipsPulled += teamMembership.modifiedCount ?? 0;

  const assignmentMembership = await Assignment.updateMany(
    { $or: [{ studentIds: userObjId }, { 'studentProgress.studentId': userObjId }] },
    { $pull: { studentIds: userObjId, studentProgress: { studentId: userObjId } } },
  );
  membershipsPulled += assignmentMembership.modifiedCount ?? 0;

  const schoolMembership = await School.updateMany(
    { $or: [{ teachers: userObjId }, { students: userObjId }] },
    { $pull: { teachers: userObjId, students: userObjId } },
  );
  membershipsPulled += schoolMembership.modifiedCount ?? 0;

  // Parent/guardian links held on other users' records.
  const linkedStudents = await User.updateMany(
    { linkedStudentIds: userObjId },
    { $pull: { linkedStudentIds: userObjId } },
  );
  membershipsPulled += linkedStudents.modifiedCount ?? 0;

  // --- (d) ARCHIVE OWNED CONTAINERS --------------------------------------

  // Step 10: classrooms this user taught. Deleting them would destroy every
  // enrolled student's assignment history, so the room is archived instead and
  // the roster is left intact. `teacherId` still names the account that is
  // going away, which is what an admin reassigning the room needs to know.
  const classroomsArchived = await Classroom.updateMany(
    { teacherId: userObjId, isArchived: { $ne: true } },
    { $set: { isArchived: true } },
  );
  byCollection.classrooms_archived = classroomsArchived.modifiedCount ?? 0;

  // --- (b) ANONYMIZE AND RETAIN ------------------------------------------

  let anonymizedRecordCount = 0;

  // Step 11: revenue events. `userId` is optional on this schema, so nulling
  // it is enough. `stripeCustomerId` stays: it is the reconciliation key
  // against Stripe's own books and is what makes the retained row useful for
  // a tax filing or a refund dispute.
  const revenueResult = await RevenueEvent.updateMany(
    { userId: userObjId },
    { $set: { userId: null } },
  );
  byCollection.revenue_events = revenueResult.modifiedCount ?? 0;
  anonymizedRecordCount += revenueResult.modifiedCount ?? 0;

  // Step 12: manual Cash App payments. `userId` is required here, so the
  // tombstone id goes in rather than null. `verifiedBy` is handled separately
  // because an admin who verified someone else's payment can also delete their
  // own account.
  const cashAppPaid = await CashAppPayment.updateMany(
    { userId: userObjId },
    { $set: { userId: DELETED_USER_TOMBSTONE } },
  );
  const cashAppVerified = await CashAppPayment.updateMany(
    { verifiedBy: userObjId },
    { $set: { verifiedBy: DELETED_USER_TOMBSTONE } },
  );
  const cashAppCount = (cashAppPaid.modifiedCount ?? 0) + (cashAppVerified.modifiedCount ?? 0);
  byCollection.cash_app_payments = cashAppCount;
  anonymizedRecordCount += cashAppCount;

  // Step 13: auth logs. These back brute-force and takeover investigations, so
  // the rows stay. The email is the direct identifier and is nulled. The
  // userId is kept as an opaque grouping key: the User row it pointed at is
  // gone by the end of this function, so it no longer resolves to a person,
  // and without it a security review cannot tell one actor's failed logins
  // apart from another's.
  const db = mongoose.connection.db;
  if (db) {
    const authLogsResult = await db.collection('auth_logs').updateMany(
      { userId: userObjId.toString(), email: { $ne: null } },
      { $set: { email: null, anonymizedAt: new Date() } },
    );
    byCollection.auth_logs = authLogsResult.modifiedCount ?? 0;
    anonymizedRecordCount += authLogsResult.modifiedCount ?? 0;
  } else {
    byCollection.auth_logs = 0;
  }

  // Step 14: API usage counters. These feed overage billing, so they are
  // financial-adjacent and the row stays. `userId` is required on the schema,
  // so it gets the tombstone rather than a null the admin console cannot read.
  // `apiKeyId` stays as the grouping key, same reasoning as auth_logs.
  const apiUsageResult = await ApiUsage.updateMany(
    { userId: userObjId },
    { $set: { userId: DELETED_USER_TOMBSTONE } },
  );
  byCollection.api_usage = apiUsageResult.modifiedCount ?? 0;
  anonymizedRecordCount += apiUsageResult.modifiedCount ?? 0;

  // Step 15: API request logs. ApiLog carries no userId at all, only the
  // apiKeyId of the key that made the call, so there is no user reference to
  // cut. What it does carry is the caller's IP and user agent, and those are
  // the direct identifiers here. They are blanked; endpoint, status, and
  // timing stay so the ops history is still readable. The rows also expire on
  // their own after 90 days via the schema's TTL index.
  if (apiKeyIds.length > 0) {
    const apiLogResult = await ApiLog.updateMany(
      { apiKeyId: { $in: apiKeyIds } },
      { $set: { ip: '', userAgent: '' } },
    );
    byCollection.api_logs = apiLogResult.modifiedCount ?? 0;
    anonymizedRecordCount += apiLogResult.modifiedCount ?? 0;
  } else {
    byCollection.api_logs = 0;
  }

  // Step 16: support threads. Conversation and Message are not user-to-user
  // DMs; they are the user-to-admin support queue, and the admin half is the
  // business's own record of what it was told and what it answered. The thread
  // is closed and the person is cut out of it. Nothing is deleted, including
  // replies written by an admin.
  const conversationsResult = await Conversation.updateMany(
    { userId: userObjId },
    { $set: { userId: DELETED_USER_TOMBSTONE, status: 'closed', unreadByUser: false } },
  );
  byCollection.conversations = conversationsResult.modifiedCount ?? 0;
  anonymizedRecordCount += conversationsResult.modifiedCount ?? 0;

  const messagesResult = await Message.updateMany(
    { senderId: userObjId },
    { $set: { senderId: DELETED_USER_TOMBSTONE } },
  );
  byCollection.messages = messagesResult.modifiedCount ?? 0;
  anonymizedRecordCount += messagesResult.modifiedCount ?? 0;

  // Step 17: everything else holding a reference to this account. Each row is
  // somebody else's record or an aggregate that would lose meaning if it
  // vanished, so the row survives and only the pointer is cut. Optional refs
  // become null; required refs get the tombstone.
  const challengeCreator = await Challenge.updateMany(
    { creatorId: userObjId },
    { $set: { creatorId: DELETED_USER_TOMBSTONE } },
  );
  // Leaderboard rows keep their rank and score so the other players' results
  // still add up. The name and the id are what go.
  const challengeParticipant = await Challenge.updateMany(
    { 'participants.userId': userObjId },
    {
      $set: {
        'participants.$[entry].userId': DELETED_USER_TOMBSTONE,
        'participants.$[entry].userName': DELETED_USER_DISPLAY_NAME,
      },
    },
    { arrayFilters: [{ 'entry.userId': userObjId }] },
  );
  const challengeCount =
    (challengeCreator.modifiedCount ?? 0) + (challengeParticipant.modifiedCount ?? 0);
  byCollection.challenges = challengeCount;
  anonymizedRecordCount += challengeCount;

  const shareEventsResult = await ShareEvent.updateMany(
    { convertedUserId: userObjId },
    { $set: { convertedUserId: null } },
  );
  byCollection.share_events = shareEventsResult.modifiedCount ?? 0;
  anonymizedRecordCount += shareEventsResult.modifiedCount ?? 0;

  const abTestResult = await ABTestEvent.updateMany(
    { userId: userObjId },
    { $set: { userId: null } },
  );
  byCollection.ab_test_events = abTestResult.modifiedCount ?? 0;
  anonymizedRecordCount += abTestResult.modifiedCount ?? 0;

  // A flag is the moderation record of somebody else's set. Deleting it would
  // erase the reason that set was actioned.
  const flagReporter = await ContentFlag.updateMany(
    { reportedBy: userObjId },
    { $set: { reportedBy: DELETED_USER_TOMBSTONE } },
  );
  const flagReviewer = await ContentFlag.updateMany(
    { reviewedBy: userObjId },
    { $set: { reviewedBy: null } },
  );
  const flagCount = (flagReporter.modifiedCount ?? 0) + (flagReviewer.modifiedCount ?? 0);
  byCollection.content_flags = flagCount;
  anonymizedRecordCount += flagCount;

  const couponCreator = await CouponTracker.updateMany(
    { createdBy: userObjId },
    { $set: { createdBy: DELETED_USER_TOMBSTONE } },
  );
  // Redemption rows stay because they are how a coupon's usage cap is counted.
  const couponRedemption = await CouponTracker.updateMany(
    { 'redemptions.userId': userObjId },
    { $set: { 'redemptions.$[entry].userId': null } },
    { arrayFilters: [{ 'entry.userId': userObjId }] },
  );
  const couponCount = (couponCreator.modifiedCount ?? 0) + (couponRedemption.modifiedCount ?? 0);
  byCollection.coupon_trackers = couponCount;
  anonymizedRecordCount += couponCount;

  const invitationSender = await Invitation.updateMany(
    { invitedBy: userObjId },
    { $set: { invitedBy: DELETED_USER_TOMBSTONE } },
  );
  const invitationAccepter = await Invitation.updateMany(
    { acceptedUserId: userObjId },
    { $set: { acceptedUserId: null } },
  );
  const invitationCount =
    (invitationSender.modifiedCount ?? 0) + (invitationAccepter.modifiedCount ?? 0);
  byCollection.invitations = invitationCount;
  anonymizedRecordCount += invitationCount;

  const emailCampaignResult = await EmailCampaign.updateMany(
    { sentBy: userObjId },
    { $set: { sentBy: null } },
  );
  byCollection.email_campaigns = emailCampaignResult.modifiedCount ?? 0;
  anonymizedRecordCount += emailCampaignResult.modifiedCount ?? 0;

  const promotionResult = await Promotion.updateMany(
    { createdBy: userObjId },
    { $set: { createdBy: null } },
  );
  byCollection.promotions = promotionResult.modifiedCount ?? 0;
  anonymizedRecordCount += promotionResult.modifiedCount ?? 0;

  // Partner-side SM-2 state is keyed on the partner's own opaque student id,
  // not on a FlashLearn user. The only link back here is `linkedProfileId`,
  // set when a student claimed a FlashLearn account. Nulling it returns the
  // rows to the anonymous state they started in.
  if (profileIds.length > 0) {
    const externalStateResult = await ExternalStudentCardState.updateMany(
      { linkedProfileId: { $in: profileIds } },
      { $set: { linkedProfileId: null } },
    );
    byCollection.external_student_card_states = externalStateResult.modifiedCount ?? 0;
    anonymizedRecordCount += externalStateResult.modifiedCount ?? 0;
  } else {
    byCollection.external_student_card_states = 0;
  }

  // Referral attribution held on the accounts this person brought in. Their
  // signup stays; the pointer back to the referrer goes.
  const referralResult = await User.updateMany(
    { referredBy: userObjId },
    { $set: { referredBy: null } },
  );
  byCollection.users_referral = referralResult.modifiedCount ?? 0;
  anonymizedRecordCount += referralResult.modifiedCount ?? 0;

  // Step 18: the account row itself, last, so a crash before this point
  // leaves a user who can sign in and retry rather than an orphaned session.
  const userResult = await User.deleteOne({ _id: userObjId });
  byCollection.users = userResult.deletedCount ?? 0;

  const deletedRecordCount = Object.entries(byCollection)
    .filter(([name]) => !RETAINED_COLLECTIONS.includes(name as typeof RETAINED_COLLECTIONS[number]))
    .reduce((sum, [, count]) => sum + count, 0);

  // Step 19: the receipt. Written even on a no-op re-run so support can prove
  // when a deletion request was honored.
  if (db) {
    await db.collection(ACCOUNT_DELETION_LOG_COLLECTION).insertOne({
      userId: userObjId,
      requestedAt,
      completedAt: new Date(),
      deletedRecordCount,
      anonymizedRecordCount,
      membershipsPulled,
      byCollection,
      requesterIp: meta.requesterIp,
      requestId: meta.requestId,
    });
  }

  return { deletedRecordCount, anonymizedRecordCount, membershipsPulled, byCollection };
}

export interface AccountSoftDeleteResult {
  deletedAt: Date;
  purgeScheduledFor: Date;
  // Sets that were public and are now hidden for the length of the wait.
  hiddenSetCount: number;
  // True when the account was already waiting and this call changed nothing.
  alreadyScheduled: boolean;
}

// Mark an account for deletion and start the clock, without destroying
// anything yet.
//
// A deletion cannot be undone, and the request that triggers it is usually made
// in a bad five minutes. So the account is stamped, its public work is taken
// down, and the irreversible part waits for the cron. Signing in during the
// wait cancels the whole thing through restoreUserAccount().
//
// Taking the sets private is the part that has to happen now rather than at
// purge time: an account that has asked to be gone should stop showing up in
// Explore the moment it asks, not thirty days later. The ids of the sets that
// were flipped are recorded on the User so a restore puts back exactly those
// and leaves sets the owner had already made private alone.
export async function softDeleteUserAccount(
  userId: Types.ObjectId | string,
  options: { graceDays?: number } = {},
): Promise<AccountSoftDeleteResult | null> {
  const userObjId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

  const existing = await User.findById(userObjId)
    .select('deletedAt purgeScheduledFor deletionHiddenSetIds')
    .lean<{
      deletedAt?: Date;
      purgeScheduledFor?: Date;
      deletionHiddenSetIds?: Types.ObjectId[];
    } | null>();

  if (!existing) return null;

  // A second request must not overwrite the recorded set ids with an empty
  // list, which would strand those sets as private after a restore.
  if (existing.deletedAt && existing.purgeScheduledFor) {
    return {
      deletedAt: existing.deletedAt,
      purgeScheduledFor: existing.purgeScheduledFor,
      hiddenSetCount: existing.deletionHiddenSetIds?.length ?? 0,
      alreadyScheduled: true,
    };
  }

  const deletedAt = new Date();
  const graceDays = options.graceDays ?? ACCOUNT_GRACE_PERIOD_DAYS;
  const purgeScheduledFor = new Date(deletedAt.getTime() + graceDays * 24 * 60 * 60 * 1000);

  const profiles = await Profile.find({ user: userObjId }, { _id: 1 })
    .lean<Array<{ _id: Types.ObjectId }>>();
  const profileIds = profiles.map((p) => p._id);

  let hiddenSetIds: Types.ObjectId[] = [];
  if (profileIds.length > 0) {
    const publicSets = await FlashcardSet.find(
      { profile: { $in: profileIds }, isPublic: true },
      { _id: 1 },
    ).lean<Array<{ _id: Types.ObjectId }>>();
    hiddenSetIds = publicSets.map((s) => s._id);

    if (hiddenSetIds.length > 0) {
      await FlashcardSet.updateMany({ _id: { $in: hiddenSetIds } }, { $set: { isPublic: false } });
    }
  }

  await User.updateOne(
    { _id: userObjId },
    { $set: { deletedAt, purgeScheduledFor, deletionHiddenSetIds: hiddenSetIds } },
  );

  return {
    deletedAt,
    purgeScheduledFor,
    hiddenSetCount: hiddenSetIds.length,
    alreadyScheduled: false,
  };
}

export interface AccountRestoreResult {
  restored: boolean;
  restoredSetCount: number;
}

// Cancel a pending deletion and put back what the wait hid.
//
// Called on sign-in: proving you can still get into the account is the same
// proof an emailed cancellation token would give, so this is the whole undo
// path. Safe to call on any sign-in, including an id that is not an ObjectId
// and an account that was never scheduled; both return `restored: false`.
export async function restoreUserAccount(
  userId: Types.ObjectId | string,
): Promise<AccountRestoreResult> {
  if (typeof userId === 'string' && !Types.ObjectId.isValid(userId)) {
    return { restored: false, restoredSetCount: 0 };
  }
  const userObjId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

  const user = await User.findOne({ _id: userObjId, deletedAt: { $ne: null } })
    .select('deletionHiddenSetIds')
    .lean<{ deletionHiddenSetIds?: Types.ObjectId[] } | null>();

  if (!user) return { restored: false, restoredSetCount: 0 };

  const hiddenSetIds = user.deletionHiddenSetIds ?? [];
  let restoredSetCount = 0;

  if (hiddenSetIds.length > 0) {
    const setsResult = await FlashcardSet.updateMany(
      { _id: { $in: hiddenSetIds } },
      { $set: { isPublic: true } },
    );
    restoredSetCount = setsResult.modifiedCount ?? 0;
  }

  await User.updateOne(
    { _id: userObjId },
    { $unset: { deletedAt: '', purgeScheduledFor: '', deletionHiddenSetIds: '' } },
  );

  return { restored: true, restoredSetCount };
}

// Accounts whose grace period has run out, oldest request first. The cron
// hands each of these to purgeUserAccount(). Batched so one run cannot time
// out on a backlog; the next run picks up the rest.
export async function findAccountsDueForPurge(
  now: Date = new Date(),
  limit = 50,
): Promise<Types.ObjectId[]> {
  const due = await User.find(
    { deletedAt: { $ne: null }, purgeScheduledFor: { $lte: now } },
    { _id: 1 },
  )
    .sort({ purgeScheduledFor: 1 })
    .limit(limit)
    .lean<Array<{ _id: Types.ObjectId }>>();

  return due.map((u) => u._id);
}
