/**
 * @jest-environment node
 *
 * Guards the offline pull against dropping card content.
 *
 * The columns were declared in lib/powersync/schema.ts and read back by
 * StudySessionContext from the start; only the two wire ends were missing, so
 * the data had somewhere to live and never arrived. That is a hard bug to
 * notice, and the multiple-choice half is worse than invisible: when `options`
 * is absent the offline player builds answer choices by shuffling other cards'
 * backs, which for single-digit arithmetic still looks like a plausible
 * question. A student drilling the 7s offline was quietly answering an easier
 * question than the one written, with nothing on screen to say so.
 */
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/test';

jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn() }));

const mockGetServerSession = jest.fn();
jest.mock('next-auth/next', () => ({ getServerSession: () => mockGetServerSession() }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));

import { GET } from '@/app/api/sync/pull/route';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';

let mongod: MongoMemoryServer;
let userId: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Profile.deleteMany({}), FlashcardSet.deleteMany({})]);

  const user = await User.create({
    name: 'Offline Learner',
    email: 'offline@example.com',
    password: 'x',
    role: 'Student',
  });
  const profile = await Profile.create({ user: user._id, profileName: 'My Profile' });
  await User.findByIdAndUpdate(user._id, { $push: { profiles: profile._id } });
  userId = String(user._id);
  mockGetServerSession.mockResolvedValue({ user: { id: userId } });

  await FlashcardSet.create({
    profile: profile._id,
    title: 'Multiplication Facts: 7 × 0 to 7 × 10',
    source: 'CSV',
    isPublic: true,
    cardCount: 2,
    flashcards: [
      {
        front: '7 × 7 = ?',
        back: '49',
        options: [
          { id: 'a', text: '14' },
          { id: 'b', text: '42' },
          { id: 'c', text: '49' },
          { id: 'd', text: '56' },
        ],
        correctOptionId: 'c',
      },
      {
        front: 'Identify this muscle',
        back: 'Biceps brachii',
        frontImage: 'https://res.cloudinary.com/demo/biceps.jpg',
        frontImageAlt: 'A flexed upper arm',
      },
    ],
  });
});

async function pull() {
  // NextRequest, not Request: the route reads request.nextUrl.searchParams,
  // which only exists on the Next wrapper.
  const res = await GET(
    new NextRequest('http://localhost/api/sync/pull?last_synced_at=1970-01-01T00:00:00.000Z'),
  );
  const body = await res.json();
  if (!body?.data) throw new Error(`pull returned ${res.status}: ${JSON.stringify(body)}`);
  return (body.data as Array<Record<string, unknown>>).filter((d) => d.type === 'flashcards');
}

describe('GET /api/sync/pull: what an offline device receives', () => {
  it('sends the authored multiple-choice options, not just front and back', async () => {
    const cards = await pull();
    const card = cards.find((c) => (c.data as Record<string, unknown>).front === '7 × 7 = ?');
    const data = card!.data as Record<string, unknown>;

    // Stored as a JSON string: parseCardOptions in StudySessionContext expects
    // a text column, so an array here would be dropped as malformed.
    expect(typeof data.options).toBe('string');
    expect(JSON.parse(data.options as string)).toEqual([
      { id: 'a', text: '14' },
      { id: 'b', text: '42' },
      { id: 'c', text: '49' },
      { id: 'd', text: '56' },
    ]);
    expect(data.correct_option_id).toBe('c');
  });

  it('sends card media and its alt text', async () => {
    const cards = await pull();
    const card = cards.find(
      (c) => (c.data as Record<string, unknown>).front === 'Identify this muscle',
    );
    const data = card!.data as Record<string, unknown>;

    expect(data.front_image).toBe('https://res.cloudinary.com/demo/biceps.jpg');
    // Alt text travelling with the image is what keeps an offline image card
    // usable with a screen reader.
    expect(data.front_image_alt).toBe('A flexed upper arm');
  });

  it('leaves the fields a card does not use as null rather than undefined', async () => {
    const cards = await pull();
    const plain = cards.find((c) => (c.data as Record<string, unknown>).front === '7 × 7 = ?');
    const data = plain!.data as Record<string, unknown>;

    // The SQLite INSERT binds these positionally, so undefined would throw.
    for (const column of ['front_image', 'back_image', 'front_video', 'back_video']) {
      expect(data[column]).toBeNull();
    }
  });
});
