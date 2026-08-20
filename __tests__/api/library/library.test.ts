/**
 * @jest-environment node
 *
 * The personal library: GET / POST / DELETE /api/library.
 *
 * The cases worth guarding are the ones where getting it wrong is expensive:
 * a second add duplicating the row, a removal taking study progress with it,
 * and a private set answering anything other than "not found" to a stranger.
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';

let currentUserId: string | null = null;

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(async () =>
    currentUserId ? { user: { id: currentUserId } } : null,
  ),
}));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => undefined) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/logging/logger', () => ({
  Logger: {
    info: jest.fn(async () => null),
    warning: jest.fn(async () => null),
    error: jest.fn(async () => null),
  },
  LogContext: { FLASHCARD: 'flashcard', STUDY: 'study' },
}));

import { FlashcardSet } from '@/models/FlashcardSet';
import { LibraryEntry } from '@/models/LibraryEntry';
import { Profile } from '@/models/Profile';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { User } from '@/models/User';
import { GET, POST, DELETE } from '@/app/api/library/route';
import { touchLibraryEntry } from '@/lib/library/libraryService';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // The unique (profile, set) index is the whole defence against duplicates,
  // so build it before asserting on it.
  await LibraryEntry.syncIndexes();
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

afterEach(async () => {
  currentUserId = null;
  await Promise.all([
    User.deleteMany({}),
    Profile.deleteMany({}),
    FlashcardSet.deleteMany({}),
    LibraryEntry.deleteMany({}),
    StudyAnalytics.deleteMany({}),
  ]);
});

let seq = 0;

async function makeLearner() {
  seq += 1;
  const user = await User.create({
    name: `Learner ${seq}`,
    email: `learner${seq}@example.com`,
    password: 'x',
    role: 'Student',
  });
  const profile = await Profile.create({ user: user._id, profileName: 'My Profile' });
  await User.findByIdAndUpdate(user._id, { $push: { profiles: profile._id } });
  return { userId: String(user._id), profileId: profile._id as Types.ObjectId };
}

async function makeSet(profileId: Types.ObjectId, isPublic: boolean, title = 'A set') {
  return FlashcardSet.create({
    profile: profileId,
    title,
    isPublic,
    source: 'CSV',
    cardCount: 1,
    flashcards: [{ front: 'q', back: 'a' }],
  });
}

const postRequest = (setId: string) =>
  new NextRequest('http://localhost/api/library', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ setId }),
  });

const deleteRequest = (setId: string) =>
  new NextRequest(`http://localhost/api/library?setId=${setId}`, { method: 'DELETE' });

const getRequest = (query = '') =>
  new NextRequest(`http://localhost/api/library${query}`);

describe('POST /api/library', () => {
  it('rejects a caller who is not signed in', async () => {
    const owner = await makeLearner();
    const set = await makeSet(owner.profileId, true);

    const res = await POST(postRequest(String(set._id)));

    expect(res.status).toBe(401);
    expect(await LibraryEntry.countDocuments({})).toBe(0);
  });

  it('adds a public set to the caller shelf', async () => {
    const author = await makeLearner();
    const reader = await makeLearner();
    const set = await makeSet(author.profileId, true, 'Multiplication: the 7s');

    currentUserId = reader.userId;
    const res = await POST(postRequest(String(set._id)));

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ added: true, created: true });

    const entries = await LibraryEntry.find({ profile: reader.profileId });
    expect(entries).toHaveLength(1);
    expect(String(entries[0].set)).toBe(String(set._id));
  });

  it('does not duplicate when the same set is added twice', async () => {
    const author = await makeLearner();
    const reader = await makeLearner();
    const set = await makeSet(author.profileId, true);

    currentUserId = reader.userId;
    const first = await POST(postRequest(String(set._id)));
    const firstAddedAt = (await LibraryEntry.findOne({ profile: reader.profileId }))?.addedAt;

    const second = await POST(postRequest(String(set._id)));

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ added: true, created: false });
    expect(await LibraryEntry.countDocuments({ profile: reader.profileId })).toBe(1);

    // The original position in "recently added" survives the second add.
    const after = await LibraryEntry.findOne({ profile: reader.profileId });
    expect(after?.addedAt?.getTime()).toBe(firstAddedAt?.getTime());
  });

  it('survives two adds racing each other', async () => {
    const author = await makeLearner();
    const reader = await makeLearner();
    const set = await makeSet(author.profileId, true);

    currentUserId = reader.userId;
    const results = await Promise.all([
      POST(postRequest(String(set._id))),
      POST(postRequest(String(set._id))),
    ]);

    expect(results.every((r) => r.status < 400)).toBe(true);
    expect(await LibraryEntry.countDocuments({ profile: reader.profileId })).toBe(1);
  });

  it('answers 404, not 403, for a private set belonging to somebody else', async () => {
    const author = await makeLearner();
    const stranger = await makeLearner();
    const set = await makeSet(author.profileId, false, 'Private notes');

    currentUserId = stranger.userId;
    const res = await POST(postRequest(String(set._id)));

    expect(res.status).toBe(404);
    expect(await LibraryEntry.countDocuments({})).toBe(0);
  });

  it('lets the owner add their own private set', async () => {
    const owner = await makeLearner();
    const set = await makeSet(owner.profileId, false, 'Private notes');

    currentUserId = owner.userId;
    const res = await POST(postRequest(String(set._id)));

    expect(res.status).toBe(201);
    expect(await LibraryEntry.countDocuments({ profile: owner.profileId })).toBe(1);
  });

  it('rejects a setId that is not an object id', async () => {
    const reader = await makeLearner();
    currentUserId = reader.userId;

    const res = await POST(postRequest('not-an-id'));

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/library', () => {
  it('rejects a caller who is not signed in', async () => {
    const owner = await makeLearner();
    const set = await makeSet(owner.profileId, true);
    await LibraryEntry.create({ profile: owner.profileId, set: set._id });

    const res = await DELETE(deleteRequest(String(set._id)));

    expect(res.status).toBe(401);
    expect(await LibraryEntry.countDocuments({})).toBe(1);
  });

  it('keeps study progress when a set is removed and added back', async () => {
    const author = await makeLearner();
    const reader = await makeLearner();
    const set = await makeSet(author.profileId, true);

    currentUserId = reader.userId;
    await POST(postRequest(String(set._id)));

    await StudyAnalytics.create({
      profile: reader.profileId,
      set: set._id,
      cardPerformance: [],
      setPerformance: { totalStudySessions: 9, totalTimeStudied: 600, averageScore: 88 },
    });

    const removed = await DELETE(deleteRequest(String(set._id)));
    expect(removed.status).toBe(200);
    await expect(removed.json()).resolves.toEqual({ removed: true });
    expect(await LibraryEntry.countDocuments({ profile: reader.profileId })).toBe(0);

    // The point of the whole design: progress is keyed on (profile, set) and
    // outlives the shelf entry.
    const analytics = await StudyAnalytics.findOne({ profile: reader.profileId, set: set._id });
    expect(analytics?.setPerformance?.totalStudySessions).toBe(9);

    const readded = await POST(postRequest(String(set._id)));
    expect(readded.status).toBe(201);
    const stillThere = await StudyAnalytics.findOne({ profile: reader.profileId, set: set._id });
    expect(stillThere?.setPerformance?.totalStudySessions).toBe(9);
    expect(stillThere?.setPerformance?.averageScore).toBe(88);
  });

  it('does not touch another learner shelf entry for the same set', async () => {
    const author = await makeLearner();
    const other = await makeLearner();
    const caller = await makeLearner();
    const set = await makeSet(author.profileId, true);

    await LibraryEntry.create({ profile: other.profileId, set: set._id });

    currentUserId = caller.userId;
    const res = await DELETE(deleteRequest(String(set._id)));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ removed: false });
    expect(await LibraryEntry.countDocuments({ profile: other.profileId })).toBe(1);
  });
});

describe('GET /api/library', () => {
  it('rejects a caller who is not signed in', async () => {
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it('returns an empty shelf rather than an error', async () => {
    const reader = await makeLearner();
    currentUserId = reader.userId;

    const res = await GET(getRequest());

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ sets: [], total: 0 });
  });

  it('sorts by most recently studied, then most recently added', async () => {
    const author = await makeLearner();
    const reader = await makeLearner();
    const studiedOld = await makeSet(author.profileId, true, 'Studied last week');
    const studiedRecent = await makeSet(author.profileId, true, 'Studied today');
    const addedFirst = await makeSet(author.profileId, true, 'Never studied, added first');
    const addedLast = await makeSet(author.profileId, true, 'Never studied, added last');

    const day = 86_400_000;
    const now = Date.now();
    await LibraryEntry.create([
      { profile: reader.profileId, set: addedFirst._id, addedAt: new Date(now - 5 * day) },
      { profile: reader.profileId, set: addedLast._id, addedAt: new Date(now - 1 * day) },
      {
        profile: reader.profileId,
        set: studiedOld._id,
        addedAt: new Date(now - 30 * day),
        lastStudiedAt: new Date(now - 7 * day),
      },
      {
        profile: reader.profileId,
        set: studiedRecent._id,
        addedAt: new Date(now - 40 * day),
        lastStudiedAt: new Date(now - 1 * 3600_000),
      },
    ]);

    currentUserId = reader.userId;
    const res = await GET(getRequest());
    const body = await res.json();

    expect(body.total).toBe(4);
    expect(body.sets.map((s: { title: string }) => s.title)).toEqual([
      'Studied today',
      'Studied last week',
      'Never studied, added last',
      'Never studied, added first',
    ]);
  });

  it('puts a pinned set above everything else', async () => {
    const author = await makeLearner();
    const reader = await makeLearner();
    const pinned = await makeSet(author.profileId, true, 'Assigned by your teacher');
    const studied = await makeSet(author.profileId, true, 'Studied today');

    await LibraryEntry.create([
      { profile: reader.profileId, set: studied._id, lastStudiedAt: new Date() },
      { profile: reader.profileId, set: pinned._id, pinned: true },
    ]);

    currentUserId = reader.userId;
    const body = await (await GET(getRequest())).json();

    expect(body.sets[0].title).toBe('Assigned by your teacher');
    expect(body.sets[0].pinned).toBe(true);
  });

  it('shows only the caller shelf', async () => {
    const author = await makeLearner();
    const reader = await makeLearner();
    const other = await makeLearner();
    const mine = await makeSet(author.profileId, true, 'Mine');
    const theirs = await makeSet(author.profileId, true, 'Theirs');

    await LibraryEntry.create([
      { profile: reader.profileId, set: mine._id },
      { profile: other.profileId, set: theirs._id },
    ]);

    currentUserId = reader.userId;
    const body = await (await GET(getRequest())).json();

    expect(body.sets).toHaveLength(1);
    expect(body.sets[0].title).toBe('Mine');
  });

  it('marks a set the caller wrote as their own', async () => {
    const owner = await makeLearner();
    const set = await makeSet(owner.profileId, false, 'My own work');
    await LibraryEntry.create({ profile: owner.profileId, set: set._id });

    currentUserId = owner.userId;
    const body = await (await GET(getRequest())).json();

    expect(body.sets[0].isOwned).toBe(true);
  });

  it('skips an entry whose set has been deleted', async () => {
    const author = await makeLearner();
    const reader = await makeLearner();
    const kept = await makeSet(author.profileId, true, 'Still here');
    const gone = await makeSet(author.profileId, true, 'Deleted');

    await LibraryEntry.create([
      { profile: reader.profileId, set: kept._id },
      { profile: reader.profileId, set: gone._id },
    ]);
    await FlashcardSet.deleteOne({ _id: gone._id });

    currentUserId = reader.userId;
    const body = await (await GET(getRequest())).json();

    expect(body.sets).toHaveLength(1);
    expect(body.sets[0].title).toBe('Still here');
  });

  it('returns ids only for view=ids', async () => {
    const author = await makeLearner();
    const reader = await makeLearner();
    const set = await makeSet(author.profileId, true);
    await LibraryEntry.create({ profile: reader.profileId, set: set._id });

    currentUserId = reader.userId;
    const body = await (await GET(getRequest('?view=ids'))).json();

    expect(body).toEqual({ setIds: [String(set._id)] });
  });
});

describe('touchLibraryEntry', () => {
  it('moves a studied set to the top without creating an entry that was never added', async () => {
    const author = await makeLearner();
    const reader = await makeLearner();
    const onShelf = await makeSet(author.profileId, true, 'On the shelf');
    const notOnShelf = await makeSet(author.profileId, true, 'Just browsing');

    await LibraryEntry.create({ profile: reader.profileId, set: onShelf._id });

    await touchLibraryEntry(reader.profileId, onShelf._id);
    await touchLibraryEntry(reader.profileId, notOnShelf._id);

    const entries = await LibraryEntry.find({ profile: reader.profileId });
    expect(entries).toHaveLength(1);
    expect(entries[0].lastStudiedAt).toBeInstanceOf(Date);
  });
});
