/**
 * @jest-environment node
 *
 * Safety property 1: a teacher-managed account cannot sign in by any path.
 *
 * Both providers are driven directly, with a real database behind them, because
 * the refusal used to be accidental. A managed account has no password, so
 * bcrypt threw on the undefined hash and the catch returned null. The right
 * answer arrived for a reason nobody chose, and a later refactor of the catch
 * would have opened the door without touching anything that looked like auth.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { hash } from 'bcrypt';

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
// `clientPromise` is awaited on every authorize call, so a thenable resolves at
// call time rather than at import time, when mongoose is not connected yet.
// `client.db()` is pinned to mongoose's own database so the raw driver reads
// the rows the models wrote.
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

import { authOptions } from '@/lib/auth/auth';
import { User } from '@/models/User';
import { buildManagedEmail, hashClaimCode } from '@/lib/teacher/managedStudents';

let mongod: MongoMemoryServer;

const TEACHER_ID = new Types.ObjectId('64d000000000000000000031');

/**
 * next-auth pins `provider.id` to "credentials" for every CredentialsProvider
 * and keeps the caller's overrides, including `id` and `authorize`, on
 * `provider.options`. So both live providers report the same top-level id and
 * only the options tell them apart.
 */
function authorizeFor(id: string) {
  const provider = (authOptions.providers as any[]).find(
    (candidate) => (candidate.options?.id ?? candidate.id) === id,
  );
  if (!provider) throw new Error(`No provider with id ${id}`);
  const authorize = provider.options?.authorize ?? provider.authorize;
  if (!authorize) throw new Error(`Provider ${id} has no authorize`);
  return authorize as (credentials: any, request: any) => Promise<any>;
}

function authorizeWithPassword(email: string, password: string) {
  return authorizeFor('credentials')({ email, password }, {} as any);
}

function authorizeWithCode(email: string, code: string) {
  return authorizeFor('email-code')({ email, code }, {} as any);
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

async function seedOrdinaryStudent(email: string, password: string) {
  return User.create({
    name: 'Nadia Okonkwo',
    email,
    password: await hash(password, 10),
    role: 'Student',
    emailVerified: true,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  jest.clearAllMocks();
  await User.deleteMany({});
});

describe('the credentials sign-in path', () => {
  it('stores no password on a managed account at all', async () => {
    const userId = await seedManagedStudent();
    const raw = await User.collection.findOne({ _id: userId });

    expect(raw).not.toBeNull();
    expect(Object.keys(raw as object)).not.toContain('password');
  });

  it('refuses a managed account whatever password is offered', async () => {
    const userId = await seedManagedStudent();
    const email = buildManagedEmail(userId);

    await expect(authorizeWithPassword(email, 'anything at all')).resolves.toBeNull();
    await expect(authorizeWithPassword(email, '')).resolves.toBeNull();
  });

  it('refuses a managed account even if a password somehow got written to it', async () => {
    // The explicit refusal has to come first. If it only ran after the bcrypt
    // compare, an account that acquired a hash by any route at all would sign
    // in as the student.
    const userId = await seedManagedStudent();
    await User.updateOne(
      { _id: userId },
      { $set: { password: await hash('CorrectHorse1!', 10), emailVerified: true } },
    );

    await expect(
      authorizeWithPassword(buildManagedEmail(userId), 'CorrectHorse1!'),
    ).resolves.toBeNull();
  });

  it('gives a managed account the same answer as a wrong password', async () => {
    const userId = await seedManagedStudent();
    await seedOrdinaryStudent('nadia@example.com', 'CorrectHorse1!');

    const managed = await authorizeWithPassword(buildManagedEmail(userId), 'CorrectHorse1!');
    const wrongPassword = await authorizeWithPassword('nadia@example.com', 'not the password');
    const noSuchUser = await authorizeWithPassword('nobody@example.com', 'CorrectHorse1!');

    expect(managed).toBeNull();
    expect(wrongPassword).toBeNull();
    expect(noSuchUser).toBeNull();
  });

  it('still signs in an ordinary verified account', async () => {
    const user = await seedOrdinaryStudent('nadia@example.com', 'CorrectHorse1!');

    const result = await authorizeWithPassword('nadia@example.com', 'CorrectHorse1!');

    expect(result).not.toBeNull();
    expect(result.id).toBe(String(user._id));
    expect(result.email).toBe('nadia@example.com');
  });
});

describe('the email-code sign-in path', () => {
  it('refuses a managed account that has a valid unexpired code planted on it', async () => {
    // A managed address is in .invalid so no code could ever be delivered, and
    // nothing writes one. This plants one anyway, because the refusal must not
    // depend on either of those staying true.
    const userId = await seedManagedStudent();
    const code = '123456';
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          loginCode: crypto.createHash('sha256').update(code).digest('hex'),
          loginCodeExpires: new Date(Date.now() + 600_000),
          loginCodeAttempts: 0,
        },
      },
    );

    await expect(authorizeWithCode(buildManagedEmail(userId), code)).resolves.toBeNull();
  });

  it('does not mark a managed account verified as a side effect of the attempt', async () => {
    const userId = await seedManagedStudent();
    const code = '654321';
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          loginCode: crypto.createHash('sha256').update(code).digest('hex'),
          loginCodeExpires: new Date(Date.now() + 600_000),
        },
      },
    );

    await authorizeWithCode(buildManagedEmail(userId), code);

    const after = await User.findById(userId).lean<any>();
    expect(after.emailVerified).toBe(false);
    expect(after.isManaged).toBe(true);
  });

  it('still signs in an ordinary account with a valid code', async () => {
    const user = await seedOrdinaryStudent('nadia@example.com', 'CorrectHorse1!');
    const code = '987654';
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          loginCode: crypto.createHash('sha256').update(code).digest('hex'),
          loginCodeExpires: new Date(Date.now() + 600_000),
        },
      },
    );

    const result = await authorizeWithCode('nadia@example.com', code);

    expect(result).not.toBeNull();
    expect(result.id).toBe(String(user._id));
  });
});
