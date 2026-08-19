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
import { RevenueEvent } from '@/models/RevenueEvent';
import { CashAppPayment } from '@/models/CashAppPayment';
import { User } from '@/models/User';
import {
  purgeUserAccount,
  DELETED_USER_TOMBSTONE,
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
    RevenueEvent.deleteMany({}),
    CashAppPayment.deleteMany({}),
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
