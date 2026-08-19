/**
 * @jest-environment node
 *
 * The gates in lib/outbox-trigger are the only thing standing between a study
 * session and a live post, so each one is tested for the case where it holds,
 * not just the case where it opens. Every draft that should not go out has to
 * stop BEFORE sendToOutbox is reached, which is what these assertions check.
 *
 * `after` is replaced with a collector so the deferred work can be awaited, and
 * sendToOutbox is mocked, so no request leaves the process.
 */

const afterCallbacks: Array<() => Promise<void>> = [];

jest.mock('next/server', () => ({
  after: (fn: () => Promise<void>) => {
    afterCallbacks.push(fn);
  },
}));

jest.mock('../../lib/sender-outbox', () => ({
  sendToOutbox: jest.fn(async () => ({ ok: true, status: 202 })),
}));

const findById = jest.fn();
jest.mock('../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../models/User', () => ({ User: { findById: (...args: unknown[]) => findById(...args) } }));

import { sendToOutbox } from '../../lib/sender-outbox';
import { fireOutboxDrafts, fireSignupTrigger, anonymizedHandle, hashUserId } from '../../lib/outbox-trigger';

const mockedSend = sendToOutbox as jest.MockedFunction<typeof sendToOutbox>;

const OWNER_ID = '650000000000000000000001';
const MEMBER_ID = '650000000000000000000002';

/** Answers the opt-in lookup the way a `.select().lean()` chain would. */
function optInLookup(value: boolean | null) {
  findById.mockReturnValue({
    select: () => ({ lean: async () => (value === null ? null : { shareToOutboxOptIn: value }) }),
  });
}

/** Runs whatever the trigger deferred, so the network step is reached or not. */
async function runAfter() {
  const queued = afterCallbacks.splice(0, afterCallbacks.length);
  for (const fn of queued) await fn();
}

const draft = {
  triggerUserId: OWNER_ID,
  externalRefBase: 'study-session-abc',
  caption: 'Just drilled 20 cards.',
};

beforeEach(() => {
  jest.clearAllMocks();
  afterCallbacks.length = 0;
  process.env.OUTBOX_TRIGGER_ENABLED = 'true';
  process.env.PRODUCT_OWNER_USER_ID = OWNER_ID;
  process.env.OUTBOX_INGEST_URL = 'https://outbox.example/ingest';
  process.env.OUTBOX_SOURCE_SLUG = 'flashlearnai';
  process.env.OUTBOX_INGEST_SECRET = 'test-secret';
  optInLookup(false);
});

describe('fireOutboxDrafts: the kill switch', () => {
  it('sends nothing and defers nothing when OUTBOX_TRIGGER_ENABLED is unset', async () => {
    delete process.env.OUTBOX_TRIGGER_ENABLED;

    fireOutboxDrafts(draft);

    expect(afterCallbacks).toHaveLength(0);
    await runAfter();
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('sends nothing when OUTBOX_TRIGGER_ENABLED is any value other than "true"', async () => {
    process.env.OUTBOX_TRIGGER_ENABLED = 'yes';

    fireOutboxDrafts(draft);
    await runAfter();

    expect(mockedSend).not.toHaveBeenCalled();
  });
});

describe('fireOutboxDrafts: who is allowed to draft', () => {
  it('drafts for the product owner without consulting the opt-in flag', async () => {
    fireOutboxDrafts(draft);
    await runAfter();

    expect(findById).not.toHaveBeenCalled();
    expect(mockedSend).toHaveBeenCalledTimes(3);
    const platforms = mockedSend.mock.calls.map(([arg]) => arg.submission.platform);
    expect(platforms).toEqual(['twitter', 'bluesky', 'linkedin']);
    expect(mockedSend.mock.calls[0][0].submission.as_draft).toBe(true);
    expect(mockedSend.mock.calls[0][0].submission.external_ref).toBe('study-session-abc-twitter');
  });

  it('drafts for a user who opted in', async () => {
    optInLookup(true);

    fireOutboxDrafts({ ...draft, triggerUserId: MEMBER_ID });
    await runAfter();

    expect(findById).toHaveBeenCalledWith(MEMBER_ID);
    expect(mockedSend).toHaveBeenCalledTimes(3);
  });

  it('sends nothing for a user who has not opted in', async () => {
    optInLookup(false);

    fireOutboxDrafts({ ...draft, triggerUserId: MEMBER_ID });
    await runAfter();

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('sends nothing when the account cannot be found', async () => {
    optInLookup(null);

    fireOutboxDrafts({ ...draft, triggerUserId: MEMBER_ID });
    await runAfter();

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('fails closed when the opt-in lookup throws', async () => {
    findById.mockImplementation(() => {
      throw new Error('database unreachable');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    fireOutboxDrafts({ ...draft, triggerUserId: MEMBER_ID });
    await runAfter();

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('sends nothing for an empty trigger user id, even with PRODUCT_OWNER_USER_ID unset', async () => {
    delete process.env.PRODUCT_OWNER_USER_ID;

    fireOutboxDrafts({ ...draft, triggerUserId: '' });
    await runAfter();

    expect(findById).not.toHaveBeenCalled();
    expect(mockedSend).not.toHaveBeenCalled();
  });
});

describe('fireSignupTrigger', () => {
  const newUser = { id: MEMBER_ID, handle: null, email: 'jo.rivera@example.com' };

  it('sends nothing when the kill switch is off', async () => {
    delete process.env.OUTBOX_TRIGGER_ENABLED;

    await fireSignupTrigger({ newUser, tier: 'annual' });
    await runAfter();

    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('adds linkedin for a paid tier and names the tier in the caption', async () => {
    await fireSignupTrigger({ newUser, tier: 'monthly' });
    await runAfter();

    const platforms = mockedSend.mock.calls.map(([arg]) => arg.submission.platform);
    expect(platforms).toEqual(['twitter', 'bluesky', 'linkedin']);
    expect(mockedSend.mock.calls[0][0].submission.caption).toContain('monthly members');
    expect(mockedSend.mock.calls[0][0].submission.external_ref).toContain('signup-monthly');
  });

  it('keeps a free signup off linkedin', async () => {
    await fireSignupTrigger({ newUser, tier: 'free' });
    await runAfter();

    const platforms = mockedSend.mock.calls.map(([arg]) => arg.submission.platform);
    expect(platforms).toEqual(['twitter', 'bluesky']);
  });

  it('never puts a full email address in the caption', async () => {
    await fireSignupTrigger({ newUser, tier: 'annual' });
    await runAfter();

    expect(mockedSend.mock.calls[0][0].submission.caption).not.toContain('jo.rivera@example.com');
  });
});

describe('caption helpers', () => {
  it('prefers a chosen handle over anything derived from the email', () => {
    expect(anonymizedHandle({ handle: 'nova', email: 'jo.rivera@example.com' })).toBe('@nova');
  });

  it('falls back to initials plus a short hash, never the email local part', () => {
    const derived = anonymizedHandle({ email: 'jo.rivera@example.com' });
    expect(derived).toMatch(/^JR-[0-9a-f]{4}$/);
  });

  it('hashes a user id to a stable 8 characters', () => {
    expect(hashUserId(MEMBER_ID)).toHaveLength(8);
    expect(hashUserId(MEMBER_ID)).toBe(hashUserId(MEMBER_ID));
    expect(hashUserId(MEMBER_ID)).not.toBe(hashUserId(OWNER_ID));
  });
});
