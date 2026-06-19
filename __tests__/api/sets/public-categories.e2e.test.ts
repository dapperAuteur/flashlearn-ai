/**
 * @jest-environment node
 *
 * Regression guard for the MissingSchemaError on /api/sets/public: the route
 * populates `categories`, which throws on a cold start unless the Category model
 * is registered. Seeding a public set with a category and getting a 200 with the
 * category name populated proves the model is registered.
 */

jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Category } from '@/models/Category';

import { GET as getPublicSets } from '@/app/api/sets/public/route';

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
  await Promise.all([FlashcardSet.deleteMany({}), Category.deleteMany({})]);
});

it('returns public sets with categories populated (no MissingSchemaError)', async () => {
  const cat = await Category.create({ name: 'Biology', slug: 'biology', color: '#22c55e' });
  await FlashcardSet.create({
    profile: new Types.ObjectId(),
    title: 'Cell Biology Basics',
    isPublic: true,
    source: 'CSV',
    cardCount: 1,
    flashcards: [{ front: 'Q', back: 'A' }],
    categories: [cat._id],
  });

  const res = await getPublicSets(new NextRequest('https://flashlearnai.witus.online/api/sets/public'));
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(JSON.stringify(body)).toContain('Biology');
});
