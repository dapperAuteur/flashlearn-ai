import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { Challenge } from '@/models/Challenge';
import { FlashcardSet } from '@/models/FlashcardSet';
import { User } from '@/models/User';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';
import { generateChallengeCode } from '@/lib/utils/challengeCode';

const MAX_PARTICIPANTS: Record<string, number> = {
  direct: 10,
  classroom: 30,
  public: 50,
};

const FREE_DAILY_LIMIT = 3;
const FREE_MAX_PARTICIPANTS = 5;

async function isUserPaid(userId: string): Promise<boolean> {
  const user = await User.findById(userId).select('subscriptionTier');
  return user?.subscriptionTier === 'Lifetime Learner';
}

// POST - Create a new challenge
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const rateLimiter = getRateLimiter('versus-create', 10, 3600);
  const { success } = await rateLimiter.limit(session.user.id);
  if (!success) {
    return NextResponse.json({ message: 'Too many challenges created. Try again later.' }, { status: 429 });
  }

  await dbConnect();
  const userId = new mongoose.Types.ObjectId(session.user.id);

  const body = await request.json();
  const {
    flashcardSetId,
    studyMode = 'classic',
    studyDirection = 'front-to-back',
    scope = 'direct',
    classroomId,
    maxParticipants,
  } = body;

  if (!flashcardSetId) {
    return NextResponse.json({ message: 'flashcardSetId is required' }, { status: 400 });
  }

  // Check subscription tier for daily limits
  const isPaid = await isUserPaid(session.user.id);
  if (!isPaid) {
    // Check daily limit for free users
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayCount = await Challenge.countDocuments({
      creatorId: userId,
      createdAt: { $gte: startOfDay },
    });
    if (todayCount >= FREE_DAILY_LIMIT) {
      return NextResponse.json(
        { message: `Free users can create ${FREE_DAILY_LIMIT} challenges per day. Upgrade to Pro for unlimited.` },
        { status: 403 },
      );
    }
    // Free users can only use classic mode
    if (studyMode !== 'classic') {
      return NextResponse.json(
        { message: 'Multiple choice mode is available for Pro users.' },
        { status: 403 },
      );
    }
  }

  // Validate flashcard set exists and user has access
  const user = await User.findById(userId).select('profiles name').lean();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileIds = (user as any)?.profiles || [];

  const flashcardSet = await FlashcardSet.findOne({
    _id: new mongoose.Types.ObjectId(flashcardSetId),
    $or: [
      { profile: { $in: profileIds } },
      { isPublic: true },
    ],
  }).lean();

  if (!flashcardSet) {
    return NextResponse.json({ message: 'Flashcard set not found or not accessible' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cards = (flashcardSet as any).flashcards || [];
  if (cards.length === 0) {
    return NextResponse.json({ message: 'Flashcard set has no cards' }, { status: 400 });
  }

  // Shuffle card IDs for the challenge
  const cardIds = cards.map((c: { _id: mongoose.Types.ObjectId }) => c._id.toString());
  for (let i = cardIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cardIds[i], cardIds[j]] = [cardIds[j], cardIds[i]];
  }

  // Determine max participants
  const scopeMax = MAX_PARTICIPANTS[scope] || 2;
  const tierMax = isPaid ? scopeMax : Math.min(FREE_MAX_PARTICIPANTS, scopeMax);
  const finalMax = maxParticipants
    ? Math.min(maxParticipants, tierMax)
    : (scope === 'direct' ? 2 : tierMax);

  // Generate unique challenge code
  let challengeCode: string;
  let attempts = 0;
  do {
    challengeCode = generateChallengeCode();
    attempts++;
  } while (
    await Challenge.exists({ challengeCode }) &&
    attempts < 10
  );

  if (attempts >= 10) {
    return NextResponse.json({ message: 'Failed to generate unique code. Try again.' }, { status: 500 });
  }

  const expiryHours = isPaid ? 72 : 24;

  const challenge = await Challenge.create({
    challengeCode,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    flashcardSetId: (flashcardSet as any)._id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setName: (flashcardSet as any).title,
    creatorId: userId,
    studyMode,
    studyDirection,
    cardCount: cardIds.length,
    cardIds,
    scope,
    classroomId: classroomId ? new mongoose.Types.ObjectId(classroomId) : undefined,
    status: 'active',
    expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
    participants: [{
      userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      userName: (user as any)?.name || 'Unknown',
      status: 'accepted',
    }],
    maxParticipants: finalMax,
  });

  return NextResponse.json({
    challenge,
    challengeUrl: `/versus/join/${challengeCode}`,
  }, { status: 201 });
}

// GET - List user's challenges
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const userId = new mongoose.Types.ObjectId(session.user.id);
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const scope = searchParams.get('scope');
  const classroomId = searchParams.get('classroomId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {
    'participants.userId': userId,
  };

  if (status) filter.status = status;
  if (scope) filter.scope = scope;
  if (classroomId) filter.classroomId = new mongoose.Types.ObjectId(classroomId);

  const [challenges, total] = await Promise.all([
    Challenge.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Challenge.countDocuments(filter),
  ]);

  return NextResponse.json({ challenges, total, page, limit });
}
