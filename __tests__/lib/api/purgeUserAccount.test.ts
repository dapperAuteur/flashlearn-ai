/**
 * @jest-environment node
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
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
import {
  purgeUserAccount,
  DELETED_USER_TOMBSTONE,
  DELETED_USER_DISPLAY_NAME,
  ACCOUNT_DELETION_LOG_COLLECTION,
} from '@/lib/api/purgeUserAccount';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  // Single-node. purgeUserAccount uses no transactions, so a replica set would
  // buy nothing and is unstable on Darwin/arm64.
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  const db = mongoose.connection.db;
  await Promise.all([
    ApiKey.deleteMany({}),
    WebhookEndpoint.deleteMany({}),
    Notification.deleteMany({}),
    ActivityEvent.deleteMany({}),
    Achievement.deleteMany({}),
    Follow.deleteMany({}),
    VersusStats.deleteMany({}),
    CardResult.deleteMany({}),
    StudySession.deleteMany({}),
    StudyAnalytics.deleteMany({}),
    FlashcardSet.deleteMany({}),
    Profile.deleteMany({}),
    Classroom.deleteMany({}),
    Team.deleteMany({}),
    Assignment.deleteMany({}),
    School.deleteMany({}),
    RevenueEvent.deleteMany({}),
    CashAppPayment.deleteMany({}),
    ApiUsage.deleteMany({}),
    ApiLog.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    Challenge.deleteMany({}),
    ShareEvent.deleteMany({}),
    ABTestEvent.deleteMany({}),
    ContentFlag.deleteMany({}),
    CouponTracker.deleteMany({}),
    Invitation.deleteMany({}),
    EmailCampaign.deleteMany({}),
    ExternalStudentCardState.deleteMany({}),
    Promotion.deleteMany({}),
    User.deleteMany({}),
    db?.collection('auth_logs').deleteMany({}),
    db?.collection(ACCOUNT_DELETION_LOG_COLLECTION).deleteMany({}),
  ]);
});

const meta = { requestId: 'req-test', requesterIp: '127.0.0.1' };

interface SeededAccount {
  userId: Types.ObjectId;
  profileId: Types.ObjectId;
  setId: Types.ObjectId;
  sessionId: string;
}

// Builds one account with a full spread of owned content and activity.
async function seedAccount(slug: string): Promise<SeededAccount> {
  const user = await User.create({
    name: `User ${slug}`,
    email: `${slug}@example.test`,
    username: slug,
  });
  const userId = user._id as Types.ObjectId;

  const profile = await Profile.create({ user: userId, profileName: `${slug} profile` });
  const profileId = profile._id as Types.ObjectId;

  const set = await FlashcardSet.create({
    profile: profileId,
    title: `${slug} deck`,
    cardCount: 1,
    source: 'Prompt',
    flashcards: [{ front: 'Q', back: 'A' }],
  });
  const setId = set._id as Types.ObjectId;

  await StudyAnalytics.create({ profile: profileId, set: setId });

  const sessionId = `sess-${slug}`;
  await StudySession.create({
    sessionId,
    userId,
    listId: setId,
    totalCards: 1,
  });

  await CardResult.create({
    sessionId,
    setId: setId.toString(),
    flashcardId: new Types.ObjectId().toString(),
    isCorrect: true,
    timeSeconds: 4,
  });

  await Achievement.create({
    userId,
    type: 'first_session',
    title: 'First session',
    description: 'Finished a first study session.',
  });

  await ActivityEvent.create({ userId, type: 'study_session' });

  await Notification.create({
    userId,
    type: 'system',
    title: 'Welcome',
    message: 'Thanks for joining.',
  });

  await VersusStats.create({ userId });

  const apiKey = await ApiKey.create({
    userId,
    name: `${slug} key`,
    keyType: 'app',
    keyPrefix: `pk_${slug}`,
    keyHash: `hash_${slug}`,
  });

  await WebhookEndpoint.create({
    apiKeyId: apiKey._id,
    url: `https://example.test/${slug}`,
    secretEncrypted: 'encrypted',
  });

  return { userId, profileId, setId, sessionId };
}

async function countsFor(account: SeededAccount) {
  const [
    users,
    profiles,
    sets,
    analytics,
    sessions,
    cardResults,
    achievements,
    activity,
    notifications,
    versus,
    apiKeys,
    endpoints,
  ] = await Promise.all([
    User.countDocuments({ _id: account.userId }),
    Profile.countDocuments({ user: account.userId }),
    FlashcardSet.countDocuments({ profile: account.profileId }),
    StudyAnalytics.countDocuments({ profile: account.profileId }),
    StudySession.countDocuments({ userId: account.userId }),
    CardResult.countDocuments({ sessionId: account.sessionId }),
    Achievement.countDocuments({ userId: account.userId }),
    ActivityEvent.countDocuments({ userId: account.userId }),
    Notification.countDocuments({ userId: account.userId }),
    VersusStats.countDocuments({ userId: account.userId }),
    ApiKey.countDocuments({ userId: account.userId }),
    WebhookEndpoint.countDocuments({}),
  ]);

  return {
    users,
    profiles,
    sets,
    analytics,
    sessions,
    cardResults,
    achievements,
    activity,
    notifications,
    versus,
    apiKeys,
    endpoints,
  };
}

it('removes every owned row for the deleted account', async () => {
  const account = await seedAccount('alpha');

  const result = await purgeUserAccount(account.userId, meta);

  expect(await countsFor(account)).toEqual({
    users: 0,
    profiles: 0,
    sets: 0,
    analytics: 0,
    sessions: 0,
    cardResults: 0,
    achievements: 0,
    activity: 0,
    notifications: 0,
    versus: 0,
    apiKeys: 0,
    endpoints: 0,
  });

  expect(result.deletedRecordCount).toBeGreaterThan(0);
  expect(result.byCollection.users).toBe(1);
  expect(result.byCollection.card_results).toBe(1);
});

it('leaves a second account completely untouched', async () => {
  const doomed = await seedAccount('doomed');
  const bystander = await seedAccount('bystander');

  await purgeUserAccount(doomed.userId, meta);

  expect(await countsFor(bystander)).toEqual({
    users: 1,
    profiles: 1,
    sets: 1,
    analytics: 1,
    sessions: 1,
    cardResults: 1,
    achievements: 1,
    activity: 1,
    notifications: 1,
    versus: 1,
    apiKeys: 1,
    endpoints: 1,
  });
});

it('deletes follow edges both ways and keeps the surviving counters honest', async () => {
  const doomed = await seedAccount('follower-doomed');
  const bystander = await seedAccount('follower-bystander');

  await Follow.create({ followerId: doomed.userId, followingId: bystander.userId });
  await Follow.create({ followerId: bystander.userId, followingId: doomed.userId });
  await User.updateOne(
    { _id: bystander.userId },
    { $set: { followersCount: 1, followingCount: 1 } },
  );

  await purgeUserAccount(doomed.userId, meta);

  expect(await Follow.countDocuments({})).toBe(0);
  const survivor = await User.findById(bystander.userId).lean<{
    followersCount: number;
    followingCount: number;
  } | null>();
  expect(survivor?.followersCount).toBe(0);
  expect(survivor?.followingCount).toBe(0);
});

it('retains financial and security rows with the user reference cut', async () => {
  const account = await seedAccount('paying');
  const admin = await seedAccount('verifier');

  await RevenueEvent.create({
    userId: account.userId,
    stripeCustomerId: 'cus_retained',
    eventType: 'payment_succeeded',
    amountCents: 900,
    stripeEventId: 'evt_1',
  });

  await CashAppPayment.create({
    userId: account.userId,
    amount: 100,
    cashAppName: '$learner',
    status: 'verified',
    verifiedBy: admin.userId,
  });

  const db = mongoose.connection.db;
  await db!.collection('auth_logs').insertOne({
    event: 'login',
    userId: account.userId.toString(),
    email: 'paying@example.test',
    ipAddress: '203.0.113.9',
    userAgent: 'jest',
    status: 'success',
    timestamp: new Date(),
  });

  const result = await purgeUserAccount(account.userId, meta);

  const revenue = await RevenueEvent.findOne({ stripeEventId: 'evt_1' }).lean<{
    userId: unknown;
    stripeCustomerId: string;
    amountCents: number;
  } | null>();
  expect(revenue).not.toBeNull();
  expect(revenue?.userId ?? null).toBeNull();
  // The Stripe key stays: it is what makes the retained row usable for a tax
  // filing or a refund dispute.
  expect(revenue?.stripeCustomerId).toBe('cus_retained');
  expect(revenue?.amountCents).toBe(900);

  const payment = await CashAppPayment.findOne({ cashAppName: '$learner' }).lean<{
    userId: Types.ObjectId;
    amount: number;
  } | null>();
  expect(payment).not.toBeNull();
  expect(payment?.userId.toString()).toBe(DELETED_USER_TOMBSTONE.toString());
  expect(payment?.amount).toBe(100);

  const authLog = await db!.collection('auth_logs').findOne({ ipAddress: '203.0.113.9' });
  expect(authLog).not.toBeNull();
  expect(authLog?.email).toBeNull();
  expect(authLog?.ipAddress).toBe('203.0.113.9');
  // The opaque actor key survives so a security review can still group this
  // person's events. It no longer resolves to a User row.
  expect(authLog?.userId).toBe(account.userId.toString());

  expect(result.anonymizedRecordCount).toBe(3);
});

it('anonymizes payments the deleted account verified for somebody else', async () => {
  const admin = await seedAccount('admin-verifier');
  const payer = await seedAccount('payer');

  await CashAppPayment.create({
    userId: payer.userId,
    amount: 100,
    cashAppName: '$payer',
    status: 'verified',
    verifiedBy: admin.userId,
  });

  await purgeUserAccount(admin.userId, meta);

  const payment = await CashAppPayment.findOne({ cashAppName: '$payer' }).lean<{
    userId: Types.ObjectId;
    verifiedBy: Types.ObjectId;
  } | null>();
  expect(payment?.userId.toString()).toBe(payer.userId.toString());
  expect(payment?.verifiedBy.toString()).toBe(DELETED_USER_TOMBSTONE.toString());
});

it('pulls memberships without deleting the classroom, team, or assignment', async () => {
  const teacher = await seedAccount('teacher');
  const student = await seedAccount('student');

  const classroom = await Classroom.create({
    name: 'Period 3 Biology',
    teacherId: teacher.userId,
    students: [student.userId, teacher.userId],
    sharedSets: [student.setId, teacher.setId],
    joinCode: 'JOIN01',
  });

  const team = await Team.create({
    name: 'Study Squad',
    creatorId: teacher.userId,
    members: [
      { userId: student.userId, role: 'member' },
      { userId: teacher.userId, role: 'admin' },
    ],
    sharedSets: [student.setId],
    joinCode: 'TEAM01',
  });

  const assignment = await Assignment.create({
    title: 'Chapter 4',
    flashcardSetId: teacher.setId,
    classroomId: classroom._id,
    teacherId: teacher.userId,
    studentIds: [student.userId],
    studentProgress: [{ studentId: student.userId, status: 'in_progress' }],
  });

  await User.updateOne({ _id: teacher.userId }, { $set: { linkedStudentIds: [student.userId] } });

  const result = await purgeUserAccount(student.userId, meta);

  const classroomAfter = await Classroom.findById(classroom._id).lean<{
    students: Types.ObjectId[];
    sharedSets: Types.ObjectId[];
  } | null>();
  expect(classroomAfter).not.toBeNull();
  expect(classroomAfter?.students.map(String)).toEqual([teacher.userId.toString()]);
  expect(classroomAfter?.sharedSets.map(String)).toEqual([teacher.setId.toString()]);

  const teamAfter = await Team.findById(team._id).lean<{
    members: Array<{ userId: Types.ObjectId }>;
    sharedSets: Types.ObjectId[];
  } | null>();
  expect(teamAfter).not.toBeNull();
  expect(teamAfter?.members.map((m) => m.userId.toString())).toEqual([teacher.userId.toString()]);
  expect(teamAfter?.sharedSets).toHaveLength(0);

  const assignmentAfter = await Assignment.findById(assignment._id).lean<{
    studentIds: Types.ObjectId[];
    studentProgress: Array<{ studentId: Types.ObjectId }>;
  } | null>();
  expect(assignmentAfter).not.toBeNull();
  expect(assignmentAfter?.studentIds).toHaveLength(0);
  expect(assignmentAfter?.studentProgress).toHaveLength(0);

  const teacherAfter = await User.findById(teacher.userId).lean<{
    linkedStudentIds: Types.ObjectId[];
  } | null>();
  expect(teacherAfter?.linkedStudentIds).toHaveLength(0);

  expect(result.membershipsPulled).toBeGreaterThanOrEqual(5);
});

it('is idempotent: a second run changes nothing and does not throw', async () => {
  const account = await seedAccount('twice');
  const bystander = await seedAccount('twice-bystander');

  const first = await purgeUserAccount(account.userId, meta);
  const second = await purgeUserAccount(account.userId, meta);

  expect(first.deletedRecordCount).toBeGreaterThan(0);
  expect(second.deletedRecordCount).toBe(0);
  expect(second.anonymizedRecordCount).toBe(0);
  expect(second.membershipsPulled).toBe(0);

  expect((await countsFor(bystander)).users).toBe(1);
});

it('writes one deletion receipt per run', async () => {
  const account = await seedAccount('receipt');

  await purgeUserAccount(account.userId, meta);
  await purgeUserAccount(account.userId, meta);

  const db = mongoose.connection.db;
  const receipts = await db!
    .collection(ACCOUNT_DELETION_LOG_COLLECTION)
    .find({ userId: account.userId })
    .toArray();

  expect(receipts).toHaveLength(2);
  expect(receipts[0].requestId).toBe('req-test');
  expect(receipts[0].requesterIp).toBe('127.0.0.1');
  expect(receipts[0].byCollection.users).toBe(1);
});

it('archives the classrooms a departing teacher owned and keeps the roster', async () => {
  const teacher = await seedAccount('archiving-teacher');
  const student = await seedAccount('stranded-student');

  const classroom = await Classroom.create({
    name: 'Period 5 Chemistry',
    teacherId: teacher.userId,
    students: [student.userId],
    joinCode: 'ARCH01',
  });

  await purgeUserAccount(teacher.userId, meta);

  const after = await Classroom.findById(classroom._id).lean<{
    isArchived: boolean;
    teacherId: Types.ObjectId;
    students: Types.ObjectId[];
  } | null>();

  expect(after).not.toBeNull();
  expect(after?.isArchived).toBe(true);
  // The students are other people. Nothing about the teacher leaving removes
  // them from the room.
  expect(after?.students.map(String)).toEqual([student.userId.toString()]);
  // The former teacher's id is the breadcrumb an admin reassigns the room by.
  expect(after?.teacherId.toString()).toBe(teacher.userId.toString());
});

it('leaves a classroom the departing user only studied in unarchived', async () => {
  const teacher = await seedAccount('staying-teacher');
  const student = await seedAccount('leaving-student');

  const classroom = await Classroom.create({
    name: 'Period 1 History',
    teacherId: teacher.userId,
    students: [student.userId],
    joinCode: 'ARCH02',
  });

  await purgeUserAccount(student.userId, meta);

  const after = await Classroom.findById(classroom._id).lean<{
    isArchived: boolean;
    students: Types.ObjectId[];
  } | null>();

  expect(after?.isArchived).toBe(false);
  expect(after?.students).toHaveLength(0);
});

it('pulls the user out of a school without touching the school', async () => {
  const admin = await seedAccount('school-admin');
  const teacher = await seedAccount('school-teacher');

  const school = await School.create({
    name: 'Riverside High',
    schoolCode: 'RIVER1',
    adminId: admin.userId,
    teachers: [teacher.userId],
    students: [],
  });

  await purgeUserAccount(teacher.userId, meta);

  const after = await School.findById(school._id).lean<{
    teachers: Types.ObjectId[];
    adminId: Types.ObjectId;
  } | null>();

  expect(after).not.toBeNull();
  expect(after?.teachers).toHaveLength(0);
  expect(after?.adminId.toString()).toBe(admin.userId.toString());
});

it('closes support threads instead of deleting them, admin replies included', async () => {
  const account = await seedAccount('support-user');
  const supportAdmin = await seedAccount('support-admin');

  const conversation = await Conversation.create({
    userId: account.userId,
    type: 'bug',
    subject: 'Cards will not flip on mobile',
    status: 'open',
  });

  await Message.create({
    conversationId: conversation._id,
    senderId: account.userId,
    senderRole: 'user',
    content: 'Tapping the card does nothing on iOS.',
  });

  await Message.create({
    conversationId: conversation._id,
    senderId: supportAdmin.userId,
    senderRole: 'admin',
    content: 'Thanks, we shipped a fix this morning.',
  });

  const result = await purgeUserAccount(account.userId, meta);

  const threadAfter = await Conversation.findById(conversation._id).lean<{
    userId: Types.ObjectId;
    status: string;
    subject: string;
  } | null>();

  expect(threadAfter).not.toBeNull();
  expect(threadAfter?.status).toBe('closed');
  expect(threadAfter?.userId.toString()).toBe(DELETED_USER_TOMBSTONE.toString());
  // The operational record of what was reported survives.
  expect(threadAfter?.subject).toBe('Cards will not flip on mobile');

  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ createdAt: 1 })
    .lean<Array<{ senderId: Types.ObjectId; senderRole: string; content: string }>>();

  expect(messages).toHaveLength(2);
  expect(messages[0].senderId.toString()).toBe(DELETED_USER_TOMBSTONE.toString());
  expect(messages[0].content).toBe('Tapping the card does nothing on iOS.');
  // The admin's own reply is untouched: it is the business's record, not the
  // deleted user's.
  expect(messages[1].senderId.toString()).toBe(supportAdmin.userId.toString());
  expect(messages[1].content).toBe('Thanks, we shipped a fix this morning.');

  expect(result.byCollection.conversations).toBe(1);
  expect(result.byCollection.messages).toBe(1);
});

it('anonymizes API usage and request logs without dropping the rows', async () => {
  const account = await seedAccount('api-caller');

  const key = await ApiKey.findOne({ userId: account.userId }).lean<{
    _id: Types.ObjectId;
  } | null>();

  await ApiUsage.create({
    apiKeyId: key!._id,
    userId: account.userId,
    keyType: 'app',
    periodStart: new Date('2026-08-01'),
    periodEnd: new Date('2026-08-31'),
    apiCalls: 4200,
    overageCalls: 200,
  });

  await ApiLog.create({
    apiKeyId: key!._id,
    keyType: 'app',
    endpoint: '/api/v1/sets',
    method: 'GET',
    statusCode: 200,
    responseTimeMs: 31,
    ip: '198.51.100.7',
    userAgent: 'flashlearn-cli/1.0',
  });

  const result = await purgeUserAccount(account.userId, meta);

  const usage = await ApiUsage.findOne({ apiCalls: 4200 }).lean<{
    userId: Types.ObjectId;
    apiKeyId: Types.ObjectId;
    overageCalls: number;
  } | null>();
  expect(usage).not.toBeNull();
  // Required field, so the tombstone rather than a null the console cannot read.
  expect(usage?.userId.toString()).toBe(DELETED_USER_TOMBSTONE.toString());
  // The billable number is the whole reason the row is kept.
  expect(usage?.overageCalls).toBe(200);
  expect(usage?.apiKeyId.toString()).toBe(key!._id.toString());

  const log = await ApiLog.findOne({ endpoint: '/api/v1/sets' }).lean<{
    ip: string;
    userAgent: string;
    statusCode: number;
    responseTimeMs: number;
  } | null>();
  expect(log).not.toBeNull();
  // ApiLog carries no userId, so the IP and user agent are the identifiers to cut.
  expect(log?.ip).toBe('');
  expect(log?.userAgent).toBe('');
  expect(log?.statusCode).toBe(200);
  expect(log?.responseTimeMs).toBe(31);

  expect(result.byCollection.api_usage).toBe(1);
  expect(result.byCollection.api_logs).toBe(1);
});

it('cuts every dangling reference in the archive bucket without deleting a row', async () => {
  const account = await seedAccount('referencing');
  const other = await seedAccount('other-party');
  const referred = await seedAccount('referred-signup');

  await User.updateOne({ _id: referred.userId }, { $set: { referredBy: account.userId } });

  const challenge = await Challenge.create({
    challengeCode: 'CHAL01',
    flashcardSetId: other.setId,
    setName: 'Other deck',
    creatorId: account.userId,
    cardCount: 10,
    expiresAt: new Date(Date.now() + 86_400_000),
    participants: [
      { userId: account.userId, userName: 'User referencing', rank: 1, compositeScore: 91 },
      { userId: other.userId, userName: 'User other-party', rank: 2, compositeScore: 74 },
    ],
  });

  const share = await ShareEvent.create({
    type: 'set',
    resourceId: other.setId.toString(),
    utmSource: 'twitter',
    convertedUserId: account.userId,
  });

  const abTest = await ABTestEvent.create({
    test: 'home-hero',
    variant: 'b',
    event: 'click',
    sessionId: 'sess-ab-1',
    userId: account.userId,
  });

  const flag = await ContentFlag.create({
    setId: other.setId,
    reportedBy: account.userId,
    reason: 'spam',
    description: 'Deck is a link farm.',
  });

  const reviewedFlag = await ContentFlag.create({
    setId: referred.setId,
    reportedBy: other.userId,
    reason: 'offensive',
    reviewedBy: account.userId,
    status: 'reviewed',
  });

  const coupon = await CouponTracker.create({
    stripeCouponId: 'coup_1',
    stripePromoCodeId: 'promo_1',
    code: 'LAUNCH20',
    discountType: 'percent_off',
    discountValue: 20,
    duration: 'once',
    createdBy: account.userId,
    redemptions: [
      { userId: account.userId, subscriptionTier: 'Monthly Pro' },
      { userId: other.userId, subscriptionTier: 'Annual Pro' },
    ],
  });

  const sentInvite = await Invitation.create({
    email: 'friend@example.test',
    invitedBy: account.userId,
    token: 'tok-sent',
  });

  const acceptedInvite = await Invitation.create({
    email: 'referencing@example.test',
    invitedBy: other.userId,
    token: 'tok-accepted',
    status: 'accepted',
    acceptedUserId: account.userId,
  });

  const campaign = await EmailCampaign.create({
    name: 'August relaunch',
    subject: 'We shipped something',
    htmlContent: '<p>Hello</p>',
    segment: 'all',
    sentBy: account.userId,
    sentCount: 812,
  });

  const promotion = await Promotion.create({
    slug: 'back-to-school',
    name: 'Back to school',
    flatLimit: 500,
    startsAt: new Date('2026-08-01'),
    endsAt: new Date('2026-09-01'),
    createdBy: account.userId,
  });

  const externalState = await ExternalStudentCardState.create({
    apiKeyId: new Types.ObjectId(),
    externalStudentId: 'partner-student-9',
    setId: other.setId,
    cardId: new Types.ObjectId(),
    linkedProfileId: account.profileId,
  });

  await purgeUserAccount(account.userId, meta);

  const challengeAfter = await Challenge.findById(challenge._id).lean<{
    creatorId: Types.ObjectId;
    participants: Array<{ userId: Types.ObjectId; userName: string; rank: number }>;
  } | null>();
  expect(challengeAfter?.creatorId.toString()).toBe(DELETED_USER_TOMBSTONE.toString());
  expect(challengeAfter?.participants).toHaveLength(2);
  expect(challengeAfter?.participants[0].userId.toString()).toBe(
    DELETED_USER_TOMBSTONE.toString(),
  );
  expect(challengeAfter?.participants[0].userName).toBe(DELETED_USER_DISPLAY_NAME);
  // The scoreboard still adds up for the player who stayed.
  expect(challengeAfter?.participants[0].rank).toBe(1);
  expect(challengeAfter?.participants[1].userId.toString()).toBe(other.userId.toString());
  expect(challengeAfter?.participants[1].userName).toBe('User other-party');

  const shareAfter = await ShareEvent.findById(share._id).lean<{
    convertedUserId: Types.ObjectId | null;
    resourceId: string;
  } | null>();
  expect(shareAfter).not.toBeNull();
  expect(shareAfter?.convertedUserId).toBeNull();
  expect(shareAfter?.resourceId).toBe(other.setId.toString());

  const abTestAfter = await ABTestEvent.findById(abTest._id).lean<{
    userId: Types.ObjectId | null;
    variant: string;
  } | null>();
  expect(abTestAfter).not.toBeNull();
  expect(abTestAfter?.userId).toBeNull();
  expect(abTestAfter?.variant).toBe('b');

  const flagAfter = await ContentFlag.findById(flag._id).lean<{
    reportedBy: Types.ObjectId;
    description: string;
  } | null>();
  expect(flagAfter?.reportedBy.toString()).toBe(DELETED_USER_TOMBSTONE.toString());
  expect(flagAfter?.description).toBe('Deck is a link farm.');

  const reviewedFlagAfter = await ContentFlag.findById(reviewedFlag._id).lean<{
    reportedBy: Types.ObjectId;
    reviewedBy: Types.ObjectId | null;
  } | null>();
  expect(reviewedFlagAfter?.reportedBy.toString()).toBe(other.userId.toString());
  expect(reviewedFlagAfter?.reviewedBy).toBeNull();

  const couponAfter = await CouponTracker.findById(coupon._id).lean<{
    createdBy: Types.ObjectId;
    redemptions: Array<{ userId: Types.ObjectId | null; subscriptionTier: string }>;
  } | null>();
  expect(couponAfter?.createdBy.toString()).toBe(DELETED_USER_TOMBSTONE.toString());
  // Both redemptions stay: they are how the coupon's usage cap is counted.
  expect(couponAfter?.redemptions).toHaveLength(2);
  expect(couponAfter?.redemptions[0].userId).toBeNull();
  expect(couponAfter?.redemptions[0].subscriptionTier).toBe('Monthly Pro');
  expect(couponAfter?.redemptions[1].userId?.toString()).toBe(other.userId.toString());

  const sentInviteAfter = await Invitation.findById(sentInvite._id).lean<{
    invitedBy: Types.ObjectId;
  } | null>();
  expect(sentInviteAfter?.invitedBy.toString()).toBe(DELETED_USER_TOMBSTONE.toString());

  const acceptedInviteAfter = await Invitation.findById(acceptedInvite._id).lean<{
    invitedBy: Types.ObjectId;
    acceptedUserId: Types.ObjectId | null;
  } | null>();
  expect(acceptedInviteAfter?.invitedBy.toString()).toBe(other.userId.toString());
  expect(acceptedInviteAfter?.acceptedUserId).toBeNull();

  const campaignAfter = await EmailCampaign.findById(campaign._id).lean<{
    sentBy: Types.ObjectId | null;
    sentCount: number;
  } | null>();
  expect(campaignAfter?.sentBy).toBeNull();
  expect(campaignAfter?.sentCount).toBe(812);

  const promotionAfter = await Promotion.findById(promotion._id).lean<{
    createdBy: Types.ObjectId | null;
    flatLimit: number;
  } | null>();
  expect(promotionAfter?.createdBy).toBeNull();
  expect(promotionAfter?.flatLimit).toBe(500);

  const externalAfter = await ExternalStudentCardState.findById(externalState._id).lean<{
    linkedProfileId: Types.ObjectId | null;
    externalStudentId: string;
  } | null>();
  expect(externalAfter).not.toBeNull();
  expect(externalAfter?.linkedProfileId).toBeNull();
  expect(externalAfter?.externalStudentId).toBe('partner-student-9');

  const referredAfter = await User.findById(referred.userId).lean<{
    referredBy: Types.ObjectId | null;
  } | null>();
  expect(referredAfter).not.toBeNull();
  expect(referredAfter?.referredBy).toBeNull();
});
