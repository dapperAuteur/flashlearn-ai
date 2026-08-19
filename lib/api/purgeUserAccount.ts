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
import { RevenueEvent } from '@/models/RevenueEvent';
import { CashAppPayment } from '@/models/CashAppPayment';
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

// Deletion receipts live in their own collection. CascadePurgeLog is not reused
// here: it is keyed on (apiKeyId, childId) and requires an apiKeyId, which a
// self-serve account deletion has no equivalent of.
export const ACCOUNT_DELETION_LOG_COLLECTION = 'account_deletion_logs';

// Collections whose rows survive a deletion request with the user reference
// removed. Everything else the user owns is deleted outright.
const RETAINED_COLLECTIONS = ['revenue_events', 'cash_app_payments', 'auth_logs'] as const;

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
//   (b) ANONYMIZE AND RETAIN — financial and security records. RevenueEvent
//       and CashAppPayment back tax filings and chargeback defense;
//       auth_logs backs brute-force and account-takeover investigation. Those
//       obligations outlive an erasure request, so the row stays and the link
//       to the person is cut instead (null userId where the field is optional,
//       DELETED_USER_TOMBSTONE where it is required, email nulled).
//
//   (c) $PULL MEMBERSHIP — classrooms, teams, and assignments the user
//       belonged to but does not own. Removing a member must never delete the
//       container, because the container holds other people's data.
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

  // Parent/guardian links held on other users' records.
  const linkedStudents = await User.updateMany(
    { linkedStudentIds: userObjId },
    { $pull: { linkedStudentIds: userObjId } },
  );
  membershipsPulled += linkedStudents.modifiedCount ?? 0;

  // --- (b) ANONYMIZE AND RETAIN ------------------------------------------

  let anonymizedRecordCount = 0;

  // Step 10: revenue events. `userId` is optional on this schema, so nulling
  // it is enough. `stripeCustomerId` stays: it is the reconciliation key
  // against Stripe's own books and is what makes the retained row useful for
  // a tax filing or a refund dispute.
  const revenueResult = await RevenueEvent.updateMany(
    { userId: userObjId },
    { $set: { userId: null } },
  );
  byCollection.revenue_events = revenueResult.modifiedCount ?? 0;
  anonymizedRecordCount += revenueResult.modifiedCount ?? 0;

  // Step 11: manual Cash App payments. `userId` is required here, so the
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

  // Step 12: auth logs. These back brute-force and takeover investigations, so
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

  // Step 13: the account row itself, last, so a crash before this point
  // leaves a user who can sign in and retry rather than an orphaned session.
  const userResult = await User.deleteOne({ _id: userObjId });
  byCollection.users = userResult.deletedCount ?? 0;

  const deletedRecordCount = Object.entries(byCollection)
    .filter(([name]) => !RETAINED_COLLECTIONS.includes(name as typeof RETAINED_COLLECTIONS[number]))
    .reduce((sum, [, count]) => sum + count, 0);

  // Step 14: the receipt. Written even on a no-op re-run so support can prove
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
