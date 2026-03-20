/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api/withApiAuth';
import { Challenge } from '@/models/Challenge';
import { FlashcardSet } from '@/models/FlashcardSet';
import { User } from '@/models/User';
import { generateChallengeCode } from '@/lib/utils/challengeCode';
import dbConnect from '@/lib/db/dbConnect';
import { type ApiAuthContext } from '@/types/api';

const MAX_PARTICIPANTS: Record<string, number> = { direct: 10, classroom: 30, public: 50 };
const FREE_DAILY_LIMIT = 3;
const FREE_MAX_PARTICIPANTS = 5;

/** POST /api/v1/versus/challenges — Create a challenge */
async function handlePost(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  let body;
  try { body = await request.json(); } catch {
    return apiError('INVALID_INPUT', requestId, undefined, 'Invalid JSON.');
  }

  const { flashcardSetId, studyMode = 'classic', studyDirection = 'front-to-back', scope = 'direct', maxParticipants } = body;
  if (!flashcardSetId) return apiError('INVALID_INPUT', requestId, { field: 'flashcardSetId' }, 'flashcardSetId is required.');

  await dbConnect();
  const userId = new mongoose.Types.ObjectId(String(context.user._id));

  // Tier check: Free API = 3/day classic only, Developer/Pro = unlimited + multiple-choice
  const isPaid = context.apiTier !== 'Free';
  if (!isPaid) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await Challenge.countDocuments({ creatorId: userId, createdAt: { $gte: startOfDay } });
    if (todayCount >= FREE_DAILY_LIMIT) return apiError('QUOTA_EXCEEDED', requestId, undefined, `Free tier: ${FREE_DAILY_LIMIT} challenges/day. Upgrade for unlimited.`);
    if (studyMode !== 'classic') return apiError('FORBIDDEN', requestId, undefined, 'Multiple-choice mode requires Developer or Pro tier.');
  }

  const user = await User.findById(userId).select('profiles name').lean();
  const profileIds = (user as any)?.profiles || [];
  const set: any = await FlashcardSet.findOne({
    _id: new mongoose.Types.ObjectId(flashcardSetId),
    $or: [{ profile: { $in: profileIds } }, { isPublic: true }],
  }).lean();

  if (!set) return apiError('NOT_FOUND', requestId, undefined, 'Flashcard set not found.');
  if (!set.flashcards?.length) return apiError('INVALID_INPUT', requestId, undefined, 'Set has no cards.');

  const cardIds = set.flashcards.map((c: any) => c._id.toString());
  for (let i = cardIds.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cardIds[i], cardIds[j]] = [cardIds[j], cardIds[i]]; }

  const scopeMax = MAX_PARTICIPANTS[scope] || 2;
  const tierMax = isPaid ? scopeMax : Math.min(FREE_MAX_PARTICIPANTS, scopeMax);
  const finalMax = maxParticipants ? Math.min(maxParticipants, tierMax) : (scope === 'direct' ? 2 : tierMax);

  let challengeCode: string; let attempts = 0;
  do { challengeCode = generateChallengeCode(); attempts++; } while (await Challenge.exists({ challengeCode }) && attempts < 10);
  if (attempts >= 10) return apiError('INTERNAL_ERROR', requestId);

  const challenge = await Challenge.create({
    challengeCode, flashcardSetId: set._id, setName: set.title, creatorId: userId,
    studyMode, studyDirection, cardCount: cardIds.length, cardIds, scope,
    status: 'active', expiresAt: new Date(Date.now() + (isPaid ? 72 : 24) * 3600000),
    participants: [{ userId, userName: (user as any)?.name || 'Unknown', status: 'accepted' }],
    maxParticipants: finalMax,
  });

  return apiSuccess({
    challengeId: String(challenge._id),
    challengeCode: challenge.challengeCode,
    scope, studyMode, studyDirection, cardCount: cardIds.length,
    maxParticipants: finalMax, expiresAt: challenge.expiresAt,
  }, { requestId }, 201);
}

/** GET /api/v1/versus/challenges — List user's challenges */
async function handleGet(request: NextRequest, context: ApiAuthContext & { user: any }, requestId: string) {
  await dbConnect();
  const userId = new mongoose.Types.ObjectId(String(context.user._id));
  const url = request.nextUrl;
  const status = url.searchParams.get('status');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));

  const filter: any = { 'participants.userId': userId };
  if (status) filter.status = status;

  const [challenges, total] = await Promise.all([
    Challenge.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Challenge.countDocuments(filter),
  ]);

  return apiSuccess({
    challenges: challenges.map((c: any) => ({
      id: String(c._id), challengeCode: c.challengeCode, setName: c.setName,
      studyMode: c.studyMode, scope: c.scope, status: c.status,
      cardCount: c.cardCount, participantCount: c.participants?.length || 0,
      createdAt: c.createdAt, expiresAt: c.expiresAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, { requestId });
}

export const POST = withApiAuth(handlePost, { allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'], requiredPermission: 'versus:write' });
export const GET = withApiAuth(handleGet, { allowedKeyTypes: ['public', 'admin_public', 'admin', 'app'], requiredPermission: 'versus:read' });
