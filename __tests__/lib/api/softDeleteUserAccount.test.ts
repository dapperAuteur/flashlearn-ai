/**
 * @jest-environment node
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';
import {
  softDeleteUserAccount,
  restoreUserAccount,
  findAccountsDueForPurge,
  ACCOUNT_GRACE_PERIOD_DAYS,
} from '@/lib/api/purgeUserAccount';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  await Promise.all([
    FlashcardSet.deleteMany({}),
    Profile.deleteMany({}),
    User.deleteMany({}),
  ]);
});

interface SeededAccount {
  userId: Types.ObjectId;
  profileId: Types.ObjectId;
  publicSetId: Types.ObjectId;
  privateSetId: Types.ObjectId;
}

// One account with a public set and a set the owner had already made private.
// The pair is the point: a restore has to put back only the first one.
async function seedAccount(slug: string): Promise<SeededAccount> {
  const user = await User.create({
    name: `User ${slug}`,
    email: `${slug}@example.test`,
    username: slug,
  });
  const userId = user._id as Types.ObjectId;

  const profile = await Profile.create({ user: userId, profileName: `${slug} profile` });
  const profileId = profile._id as Types.ObjectId;

  const publicSet = await FlashcardSet.create({
    profile: profileId,
    title: `${slug} public deck`,
    cardCount: 1,
    source: 'Prompt',
    isPublic: true,
    flashcards: [{ front: 'Q', back: 'A' }],
  });

  const privateSet = await FlashcardSet.create({
    profile: profileId,
    title: `${slug} private deck`,
    cardCount: 1,
    source: 'Prompt',
    isPublic: false,
    flashcards: [{ front: 'Q', back: 'A' }],
  });

  return {
    userId,
    profileId,
    publicSetId: publicSet._id as Types.ObjectId,
    privateSetId: privateSet._id as Types.ObjectId,
  };
}

it('stamps the account and schedules the purge without destroying anything', async () => {
  const account = await seedAccount('softie');

  const result = await softDeleteUserAccount(account.userId);

  expect(result).not.toBeNull();
  expect(result?.alreadyScheduled).toBe(false);

  const after = await User.findById(account.userId).lean<{
    deletedAt: Date;
    purgeScheduledFor: Date;
    deletionHiddenSetIds: Types.ObjectId[];
  } | null>();

  expect(after).not.toBeNull();
  expect(after?.deletedAt).toBeInstanceOf(Date);

  const graceMs = after!.purgeScheduledFor.getTime() - after!.deletedAt.getTime();
  expect(Math.round(graceMs / (24 * 60 * 60 * 1000))).toBe(ACCOUNT_GRACE_PERIOD_DAYS);

  // Nothing is erased yet. That is the whole point of the wait.
  expect(await Profile.countDocuments({ user: account.userId })).toBe(1);
  expect(await FlashcardSet.countDocuments({ profile: account.profileId })).toBe(2);
});

it('takes public sets down for the length of the wait and leaves private ones alone', async () => {
  const account = await seedAccount('hider');

  const result = await softDeleteUserAccount(account.userId);

  expect(result?.hiddenSetCount).toBe(1);

  const publicSet = await FlashcardSet.findById(account.publicSetId).lean<{
    isPublic: boolean;
  } | null>();
  expect(publicSet?.isPublic).toBe(false);

  const stored = await User.findById(account.userId).lean<{
    deletionHiddenSetIds: Types.ObjectId[];
  } | null>();
  expect(stored?.deletionHiddenSetIds.map(String)).toEqual([account.publicSetId.toString()]);
});

it('does not touch anybody else on a soft delete', async () => {
  const account = await seedAccount('leaver');
  const bystander = await seedAccount('stayer');

  await softDeleteUserAccount(account.userId);

  const theirSet = await FlashcardSet.findById(bystander.publicSetId).lean<{
    isPublic: boolean;
  } | null>();
  expect(theirSet?.isPublic).toBe(true);

  const theirUser = await User.findById(bystander.userId).lean<{
    deletedAt?: Date;
  } | null>();
  expect(theirUser?.deletedAt).toBeUndefined();
});

it('is idempotent: a second request keeps the original schedule and set list', async () => {
  const account = await seedAccount('twice-over');

  const first = await softDeleteUserAccount(account.userId);
  const second = await softDeleteUserAccount(account.userId);

  expect(second?.alreadyScheduled).toBe(true);
  expect(second?.purgeScheduledFor.getTime()).toBe(first?.purgeScheduledFor.getTime());
  // The recorded ids must survive, or a restore would strand the set private.
  expect(second?.hiddenSetCount).toBe(1);

  const stored = await User.findById(account.userId).lean<{
    deletionHiddenSetIds: Types.ObjectId[];
  } | null>();
  expect(stored?.deletionHiddenSetIds.map(String)).toEqual([account.publicSetId.toString()]);
});

it('returns null for an account that is not there', async () => {
  expect(await softDeleteUserAccount(new Types.ObjectId())).toBeNull();
});

it('signing back in clears the schedule and republishes exactly what was hidden', async () => {
  const account = await seedAccount('returner');

  await softDeleteUserAccount(account.userId);
  const restore = await restoreUserAccount(account.userId);

  expect(restore.restored).toBe(true);
  expect(restore.restoredSetCount).toBe(1);

  const after = await User.findById(account.userId).lean<{
    deletedAt?: Date;
    purgeScheduledFor?: Date;
    deletionHiddenSetIds?: Types.ObjectId[];
  } | null>();
  expect(after?.deletedAt).toBeUndefined();
  expect(after?.purgeScheduledFor).toBeUndefined();
  expect(after?.deletionHiddenSetIds).toBeUndefined();

  const publicSet = await FlashcardSet.findById(account.publicSetId).lean<{
    isPublic: boolean;
  } | null>();
  expect(publicSet?.isPublic).toBe(true);

  // The set the owner had already made private stays private.
  const privateSet = await FlashcardSet.findById(account.privateSetId).lean<{
    isPublic: boolean;
  } | null>();
  expect(privateSet?.isPublic).toBe(false);
});

it('restoring an account that never asked to be deleted is a no-op', async () => {
  const account = await seedAccount('never-asked');

  const restore = await restoreUserAccount(account.userId);

  expect(restore).toEqual({ restored: false, restoredSetCount: 0 });
  const publicSet = await FlashcardSet.findById(account.publicSetId).lean<{
    isPublic: boolean;
  } | null>();
  expect(publicSet?.isPublic).toBe(true);
});

it('restoring tolerates an id that is not an ObjectId', async () => {
  // Sign-in runs this for every provider, including SSO, where the id in hand
  // is the identity provider's subject rather than a Mongo id.
  expect(await restoreUserAccount('not-an-object-id')).toEqual({
    restored: false,
    restoredSetCount: 0,
  });
});

it('finds only accounts whose grace period has run out, oldest first', async () => {
  const due = await seedAccount('due');
  const overdue = await seedAccount('overdue');
  const waiting = await seedAccount('waiting');
  const active = await seedAccount('active');

  const now = new Date('2026-09-30T00:00:00.000Z');

  await User.updateOne(
    { _id: due.userId },
    { $set: { deletedAt: new Date('2026-08-31'), purgeScheduledFor: new Date('2026-09-29') } },
  );
  await User.updateOne(
    { _id: overdue.userId },
    { $set: { deletedAt: new Date('2026-08-01'), purgeScheduledFor: new Date('2026-08-31') } },
  );
  await User.updateOne(
    { _id: waiting.userId },
    { $set: { deletedAt: new Date('2026-09-20'), purgeScheduledFor: new Date('2026-10-20') } },
  );

  const ids = await findAccountsDueForPurge(now);

  expect(ids.map(String)).toEqual([overdue.userId.toString(), due.userId.toString()]);
  expect(ids.map(String)).not.toContain(waiting.userId.toString());
  expect(ids.map(String)).not.toContain(active.userId.toString());
});

it('an account restored before the cron runs never comes up for purge', async () => {
  const account = await seedAccount('changed-mind');

  await softDeleteUserAccount(account.userId, { graceDays: 0 });
  expect((await findAccountsDueForPurge(new Date(Date.now() + 1000))).map(String)).toEqual([
    account.userId.toString(),
  ]);

  await restoreUserAccount(account.userId);

  expect(await findAccountsDueForPurge(new Date(Date.now() + 1000))).toEqual([]);
});
