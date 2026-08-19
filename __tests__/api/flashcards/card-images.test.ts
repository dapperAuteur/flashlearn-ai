/**
 * @jest-environment node
 *
 * Attaching an image to a card is the one media path that runs on a session
 * instead of an API key, so ownership, file limits, and required alt text all
 * have to hold here on their own. Cloudinary is mocked, so nothing leaves the
 * process and a rejected request can be checked for never having uploaded.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));
jest.mock('../../../lib/auth/auth', () => ({ authOptions: {} }));
jest.mock('next-auth/next', () => ({ getServerSession: jest.fn() }));
jest.mock('../../../lib/ratelimit/ratelimit', () => ({
  getRateLimiter: jest.fn(() => ({ limit: jest.fn(async () => ({ success: true })) })),
}));

jest.mock('../../../lib/media/cloudinaryUpload', () => {
  const actual = jest.requireActual('../../../lib/media/cloudinaryUpload');
  return {
    ...actual,
    uploadMediaBuffer: jest.fn(async () => ({
      url: 'https://res.cloudinary.com/test/image/deltoid.png',
      publicId: 'flashlearn/card-media/deltoid',
      type: 'image' as const,
    })),
  };
});

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import { uploadMediaBuffer, MAX_IMAGE_SIZE } from '@/lib/media/cloudinaryUpload';
import { POST as attachImage, DELETE as detachImage } from '@/app/api/flashcards/[id]/images/route';

const mockedSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedUpload = uploadMediaBuffer as jest.MockedFunction<typeof uploadMediaBuffer>;

const OWNER_ID = '64d000000000000000000001';
const INTRUDER_ID = '64d000000000000000000002';

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
  jest.clearAllMocks();
  await Promise.all([FlashcardSet.deleteMany({}), Profile.deleteMany({})]);
});

function signIn(userId: string, role = 'User') {
  mockedSession.mockResolvedValue({ user: { id: userId, role } } as never);
}

async function seedSet(userId: string, card: Record<string, unknown> = {}) {
  const profile = await Profile.create({ user: new Types.ObjectId(userId), profileName: 'Main' });
  const set = await FlashcardSet.create({
    profile: profile._id,
    title: 'Shoulder Anatomy',
    source: 'CSV',
    cardCount: 1,
    flashcards: [{ front: 'Which muscle abducts the arm?', back: 'Deltoid', ...card }],
  });
  return { setId: String(set._id), cardId: String(set.flashcards[0]._id) };
}

function uploadRequest(
  setId: string,
  fields: { file?: File; cardId?: string; side?: string; alt?: string }
) {
  const form = new FormData();
  if (fields.file) form.set('file', fields.file);
  if (fields.cardId) form.set('cardId', fields.cardId);
  if (fields.side) form.set('side', fields.side);
  if (fields.alt !== undefined) form.set('alt', fields.alt);
  return new NextRequest(`https://flashlearnai.witus.online/api/flashcards/${setId}/images`, {
    method: 'POST',
    body: form,
  });
}

function deleteRequest(setId: string, cardId: string, side: string) {
  return new NextRequest(
    `https://flashlearnai.witus.online/api/flashcards/${setId}/images?cardId=${cardId}&side=${side}`,
    { method: 'DELETE' }
  );
}

function routeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function pngFile(bytes = 32, name = 'deltoid.png') {
  return new File([Buffer.alloc(bytes)], name, { type: 'image/png' });
}

interface StoredCard {
  frontImage?: string;
  backImage?: string;
  frontImageAlt?: string;
  backImageAlt?: string;
}

async function loadCard(setId: string): Promise<StoredCard> {
  const set = (await FlashcardSet.findById(setId).lean()) as unknown as { flashcards: StoredCard[] };
  return set.flashcards[0];
}

describe('POST /api/flashcards/[id]/images', () => {
  it('attaches the image and its alt text to the requested side', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID);
    signIn(OWNER_ID);

    const res = await attachImage(
      uploadRequest(setId, { file: pngFile(), cardId, side: 'front', alt: 'Deltoid highlighted on a shoulder diagram' }),
      routeParams(setId)
    );

    expect(res.status).toBe(201);
    const card = await loadCard(setId);
    expect(card.frontImage).toBe('https://res.cloudinary.com/test/image/deltoid.png');
    expect(card.frontImageAlt).toBe('Deltoid highlighted on a shoulder diagram');
    expect(card.backImage).toBeUndefined();
  });

  it('rejects an unauthenticated caller', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID);
    mockedSession.mockResolvedValue(null as never);

    const res = await attachImage(
      uploadRequest(setId, { file: pngFile(), cardId, side: 'front', alt: 'A diagram' }),
      routeParams(setId)
    );

    expect(res.status).toBe(401);
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('refuses to attach media to somebody else’s set', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID);
    await Profile.create({ user: new Types.ObjectId(INTRUDER_ID), profileName: 'Intruder' });
    signIn(INTRUDER_ID);

    const res = await attachImage(
      uploadRequest(setId, { file: pngFile(), cardId, side: 'front', alt: 'A diagram' }),
      routeParams(setId)
    );

    expect(res.status).toBe(404);
    expect(mockedUpload).not.toHaveBeenCalled();
    const card = await loadCard(setId);
    expect(card.frontImage).toBeUndefined();
  });

  it('rejects a file that is not an image', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID);
    signIn(OWNER_ID);

    const file = new File([Buffer.from('front,back')], 'cards.csv', { type: 'text/csv' });
    const res = await attachImage(
      uploadRequest(setId, { file, cardId, side: 'front', alt: 'A diagram' }),
      routeParams(setId)
    );

    expect(res.status).toBe(400);
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('rejects a video, which belongs on the video fields rather than the image ones', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID);
    signIn(OWNER_ID);

    const file = new File([Buffer.alloc(64)], 'clip.mp4', { type: 'video/mp4' });
    const res = await attachImage(
      uploadRequest(setId, { file, cardId, side: 'front', alt: 'A clip' }),
      routeParams(setId)
    );

    expect(res.status).toBe(400);
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('rejects an image over the shared size cap', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID);
    signIn(OWNER_ID);

    const res = await attachImage(
      uploadRequest(setId, {
        file: pngFile(MAX_IMAGE_SIZE + 1024, 'huge.png'),
        cardId,
        side: 'front',
        alt: 'A diagram',
      }),
      routeParams(setId)
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/too large/i);
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('rejects a request with no alt text', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID);
    signIn(OWNER_ID);

    const res = await attachImage(
      uploadRequest(setId, { file: pngFile(), cardId, side: 'front' }),
      routeParams(setId)
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/alt text is required/i);
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('rejects alt text that is only whitespace', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID);
    signIn(OWNER_ID);

    const res = await attachImage(
      uploadRequest(setId, { file: pngFile(), cardId, side: 'front', alt: '   ' }),
      routeParams(setId)
    );

    expect(res.status).toBe(400);
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('rejects a card id that is not in the set', async () => {
    const { setId } = await seedSet(OWNER_ID);
    signIn(OWNER_ID);

    const res = await attachImage(
      uploadRequest(setId, {
        file: pngFile(),
        cardId: new Types.ObjectId().toString(),
        side: 'front',
        alt: 'A diagram',
      }),
      routeParams(setId)
    );

    expect(res.status).toBe(404);
    expect(mockedUpload).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/flashcards/[id]/images', () => {
  it('clears the image URL and its alt text together', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID, {
      backImage: 'https://res.cloudinary.com/test/image/old.png',
      backImageAlt: 'The old picture',
    });
    signIn(OWNER_ID);

    const res = await detachImage(deleteRequest(setId, cardId, 'back'), routeParams(setId));

    expect(res.status).toBe(200);
    const card = await loadCard(setId);
    expect(card.backImage).toBeUndefined();
    expect(card.backImageAlt).toBeUndefined();
  });

  it('refuses to remove media from somebody else’s set', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID, {
      backImage: 'https://res.cloudinary.com/test/image/old.png',
      backImageAlt: 'The old picture',
    });
    await Profile.create({ user: new Types.ObjectId(INTRUDER_ID), profileName: 'Intruder' });
    signIn(INTRUDER_ID);

    const res = await detachImage(deleteRequest(setId, cardId, 'back'), routeParams(setId));

    expect(res.status).toBe(404);
    const card = await loadCard(setId);
    expect(card.backImage).toBe('https://res.cloudinary.com/test/image/old.png');
  });

  it('returns 404 when that side has no image', async () => {
    const { setId, cardId } = await seedSet(OWNER_ID);
    signIn(OWNER_ID);

    const res = await detachImage(deleteRequest(setId, cardId, 'front'), routeParams(setId));

    expect(res.status).toBe(404);
  });
});
