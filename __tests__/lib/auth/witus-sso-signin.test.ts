/**
 * @jest-environment node
 *
 * "Sign in with WitUS" has to land on a real local account.
 *
 * There is no NextAuth adapter and the session strategy is JWT, so nothing in
 * the framework creates or looks up a user. `profile()` used to return the
 * IdP's `sub` as `id`, which became `session.user.id` unchanged: the browser
 * looked signed in and every query keyed on that id matched nothing. These
 * tests drive the real provider hook against a real database so the mapping
 * cannot regress to a pass-through again.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { hash } from 'bcrypt';

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
// `clientPromise` is awaited inside the provider hook, so a thenable resolves
// at call time rather than at import time, when mongoose is not connected yet.
// `client.db()` is pinned to mongoose's own database so the raw driver reads
// the rows the models wrote and the other way round.
jest.mock('../../../lib/db/mongodb', () => ({
  __esModule: true,
  default: {
    then: (resolve: (client: unknown) => unknown) =>
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      resolve({ db: () => require('mongoose').connection.db }),
  },
}));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { AUTH: 'auth' },
}));
jest.mock('../../../lib/api/purgeUserAccount', () => ({
  restoreUserAccount: jest.fn(async () => ({ restored: false, restoredSetCount: 0 })),
}));

import { User } from '@/models/User';
import { buildManagedEmail, hashClaimCode } from '@/lib/teacher/managedStudents';

let mongod: MongoMemoryServer;
let authOptions: any;

const TEACHER_ID = new Types.ObjectId('64d000000000000000000031');

/** A MongoDB `_id` rendered as a string, which is the whole point of the fix. */
const OBJECT_ID = /^[0-9a-f]{24}$/;

const WITUS_ACCOUNT = {
  sub: 'witus-subject-9f2c4a7b1d3e',
  email: 'nadia@example.com',
  name: 'Nadia Okonkwo',
  email_verified: true,
};

function witusProfileHook() {
  const provider = (authOptions.providers as any[]).find((candidate) => candidate.id === 'witus');
  if (!provider) throw new Error('The WitUS provider is not registered.');
  return provider.profile as (claims: any, tokens?: any) => Promise<any>;
}

function signInWithWitus(claims: Record<string, unknown>) {
  return witusProfileHook()(claims, {});
}

/** The `signIn` callback as next-auth calls it after an OAuth profile resolves. */
function runSignInCallback(user: any, provider = 'witus') {
  return authOptions.callbacks.signIn({
    user,
    account: { provider, type: 'oauth', providerAccountId: user.id },
    profile: WITUS_ACCOUNT,
  });
}

async function seedManagedStudent(name = 'Ada Okafor') {
  const userId = new Types.ObjectId();
  await User.create({
    _id: userId,
    name,
    email: buildManagedEmail(userId),
    role: 'Student',
    isManaged: true,
    managedBy: TEACHER_ID,
    claimCodeHash: hashClaimCode('ABCDE-FGHJK'),
    claimCodeExpires: new Date(Date.now() + 86_400_000),
    emailVerified: false,
    emailUnsubscribed: true,
  });
  return userId;
}

/** Writes the row `/api/register` writes, through the same raw driver it uses. */
async function seedRegisteredUser(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  const doc = {
    name: 'Nadia Okonkwo',
    email: 'nadia@example.com',
    password: await hash('CorrectHorse1!', 10),
    role: 'Student',
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
    profiles: [],
    subscriptionTier: 'Free',
    ageAttested: true,
    ageAttestedAt: now,
    ...overrides,
  };
  const result = await (mongoose.connection.db as any).collection('users').insertOne(doc);
  return result.insertedId as Types.ObjectId;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // The provider is only registered when a client id is configured, and the
  // providers array is built at module load, so the variable has to be in place
  // before the import runs.
  process.env.WITUS_OIDC_CLIENT_ID = 'flashlearn-test-client';
  process.env.WITUS_OIDC_CLIENT_SECRET = 'flashlearn-test-secret';
  ({ authOptions } = await import('@/lib/auth/auth'));
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await User.deleteMany({});
  await (mongoose.connection.db as any).collection('users').deleteMany({});
  await (mongoose.connection.db as any).collection('invitations').deleteMany({});
});

describe('a first-time WitUS sign-in', () => {
  it('returns a real MongoDB _id rather than the IdP subject', async () => {
    const result = await signInWithWitus(WITUS_ACCOUNT);

    expect(result.id).toMatch(OBJECT_ID);
    expect(result.id).not.toBe(WITUS_ACCOUNT.sub);
  });

  it('creates an account the rest of the app can query', async () => {
    const result = await signInWithWitus(WITUS_ACCOUNT);

    const stored = await User.findById(result.id).lean<any>();
    expect(stored).not.toBeNull();
    expect(stored.email).toBe('nadia@example.com');
    expect(stored.name).toBe('Nadia Okonkwo');
    expect(stored.role).toBe('Student');
    expect(stored.subscriptionTier).toBe('Free');
    expect(stored.emailVerified).toBe(true);
    expect(stored.profiles).toEqual([]);
    expect(stored.createdAt).toBeInstanceOf(Date);
  });

  it('leaves the new account with no password, so credentials still refuses it', async () => {
    const result = await signInWithWitus(WITUS_ACCOUNT);

    const raw = await User.collection.findOne({ _id: new Types.ObjectId(result.id) });
    expect(Object.keys(raw as object)).not.toContain('password');
  });

  it('falls back to the address local part when the IdP sends no name', async () => {
    const result = await signInWithWitus({ ...WITUS_ACCOUNT, name: undefined });

    const stored = await User.findById(result.id).lean<any>();
    expect(stored.name).toBe('nadia');
  });

  it('accepts the sign-in at the signIn callback', async () => {
    const result = await signInWithWitus(WITUS_ACCOUNT);

    await expect(runSignInCallback(result)).resolves.toBe(true);
  });
});

describe('a returning WitUS sign-in', () => {
  it('resolves to the same account instead of creating a second one', async () => {
    const first = await signInWithWitus(WITUS_ACCOUNT);
    const second = await signInWithWitus(WITUS_ACCOUNT);

    expect(second.id).toBe(first.id);
    expect(await User.countDocuments({ email: 'nadia@example.com' })).toBe(1);
  });
});

describe('linking to an account that already has a password', () => {
  it('returns the existing _id rather than duplicating the person', async () => {
    const existingId = await seedRegisteredUser();

    const result = await signInWithWitus(WITUS_ACCOUNT);

    expect(result.id).toBe(String(existingId));
    expect(await User.countDocuments({})).toBe(1);
  });

  it('matches an address registered in a different case', async () => {
    // `/api/register` writes through the raw driver, so it stores whatever case
    // the person typed while the IdP sends the address lowercased.
    const existingId = await seedRegisteredUser({ email: 'Nadia@Example.com' });

    const result = await signInWithWitus(WITUS_ACCOUNT);

    expect(result.id).toBe(String(existingId));
    expect(await User.countDocuments({})).toBe(1);
  });

  it('keeps a Teacher a Teacher', async () => {
    // The old hook hardcoded `role: "Student"`, so every SSO sign-in silently
    // demoted the account for the length of that session.
    const existingId = await seedRegisteredUser({ role: 'Teacher', subscriptionTier: 'Annual Pro' });

    const result = await signInWithWitus(WITUS_ACCOUNT);

    expect(result.id).toBe(String(existingId));
    expect(result.role).toBe('Teacher');
    expect(result.subscriptionTier).toBe('Annual Pro');
  });

  it('marks an unverified local account verified, since the IdP proved the address', async () => {
    const existingId = await seedRegisteredUser({
      emailVerified: false,
      verificationToken: 'a-stale-token',
      verificationTokenExpires: new Date(Date.now() + 3_600_000),
    });

    const result = await signInWithWitus(WITUS_ACCOUNT);

    expect(result.emailVerified).toBe(true);
    const raw = await User.collection.findOne({ _id: existingId });
    expect(raw?.emailVerified).toBe(true);
    expect(Object.keys(raw as object)).not.toContain('verificationToken');
  });

  it('closes out a pending invitation only when it creates the account', async () => {
    const invitations = (mongoose.connection.db as any).collection('invitations');
    await invitations.insertOne({ email: 'nadia@example.com', status: 'sent' });

    await signInWithWitus(WITUS_ACCOUNT);

    const invitation = await invitations.findOne({ email: 'nadia@example.com' });
    expect(invitation.status).toBe('accepted');
  });
});

describe('an email the IdP has not verified', () => {
  it.each([
    ['the claim is false', false],
    ['the claim is absent', undefined],
  ])('refuses the sign-in when %s', async (_label, emailVerified) => {
    const result = await signInWithWitus({ ...WITUS_ACCOUNT, email_verified: emailVerified });

    expect(result.id).not.toMatch(OBJECT_ID);
    await expect(runSignInCallback(result)).resolves.toBe(false);
  });

  it('creates no account for an address it cannot vouch for', async () => {
    await signInWithWitus({ ...WITUS_ACCOUNT, email_verified: false });

    expect(await User.countDocuments({})).toBe(0);
  });

  it('does not attach itself to an existing password account', async () => {
    // This is the takeover path: anyone able to register the address at the IdP
    // would otherwise inherit the FlashLearn account behind it.
    const existingId = await seedRegisteredUser();

    const result = await signInWithWitus({ ...WITUS_ACCOUNT, email_verified: false });

    expect(result.id).not.toBe(String(existingId));
    await expect(runSignInCallback(result)).resolves.toBe(false);
  });

  it('refuses a sign-in that carries no email at all', async () => {
    const result = await signInWithWitus({ sub: WITUS_ACCOUNT.sub, email_verified: true });

    await expect(runSignInCallback(result)).resolves.toBe(false);
    expect(await User.countDocuments({})).toBe(0);
  });
});

describe('accounts no sign-in path may reach', () => {
  it('refuses a teacher-managed account even with a verified address', async () => {
    // A managed address sits in the `.invalid` TLD, so no IdP could ever
    // deliver a verification mail to it. The refusal must not depend on that:
    // it is a property of how the address is built, not a rule.
    const userId = await seedManagedStudent();
    const email = buildManagedEmail(userId);

    const result = await signInWithWitus({ ...WITUS_ACCOUNT, email, email_verified: true });

    expect(result.id).not.toBe(String(userId));
    expect(result.id).not.toMatch(OBJECT_ID);
    await expect(runSignInCallback(result)).resolves.toBe(false);
  });

  it('does not mark a managed account verified as a side effect of the attempt', async () => {
    const userId = await seedManagedStudent();

    await signInWithWitus({ ...WITUS_ACCOUNT, email: buildManagedEmail(userId), email_verified: true });

    const after = await User.findById(userId).lean<any>();
    expect(after.emailVerified).toBe(false);
    expect(after.isManaged).toBe(true);
  });

  it('refuses a suspended account, matching both credentials providers', async () => {
    await seedRegisteredUser({ suspended: true });

    const result = await signInWithWitus(WITUS_ACCOUNT);

    await expect(runSignInCallback(result)).resolves.toBe(false);
  });

  it('still signs in an account inside the deletion grace period, so the sign-in can cancel it', async () => {
    // Neither credentials provider checks `deletedAt` either. Getting into the
    // account is the undo, and the signIn callback does the restoring.
    const existingId = await seedRegisteredUser({
      deletedAt: new Date(),
      purgeScheduledFor: new Date(Date.now() + 30 * 86_400_000),
    });

    const result = await signInWithWitus(WITUS_ACCOUNT);

    expect(result.id).toBe(String(existingId));
    await expect(runSignInCallback(result)).resolves.toBe(true);
  });
});

describe('the signIn callback gate', () => {
  it('refuses any WitUS identity that is not a MongoDB _id', async () => {
    // The gate is a positive test rather than a list of known refusals, so an
    // id nobody anticipated still fails closed.
    await expect(runSignInCallback({ id: WITUS_ACCOUNT.sub })).resolves.toBe(false);
    await expect(runSignInCallback({ id: '' })).resolves.toBe(false);
    await expect(runSignInCallback({ id: 'not-an-object-id' })).resolves.toBe(false);
  });

  it('leaves the credentials paths alone', async () => {
    const existingId = await seedRegisteredUser();

    await expect(runSignInCallback({ id: String(existingId) }, 'credentials')).resolves.toBe(true);
  });
});
