import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import crypto from 'crypto';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { Challenge } from '@/models/Challenge';
import { FlashcardSet } from '@/models/FlashcardSet';
import { StudySession } from '@/models/StudySession';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const { id } = await params;
  const userId = new mongoose.Types.ObjectId(session.user.id);

  const challenge = await Challenge.findById(id);
  if (!challenge) {
    return NextResponse.json({ message: 'Challenge not found' }, { status: 404 });
  }

  // Check challenge is still active
  if (challenge.status !== 'active') {
    return NextResponse.json({ message: 'Challenge is no longer active' }, { status: 400 });
  }

  if (new Date() > challenge.expiresAt) {
    challenge.status = 'expired';
    await challenge.save();
    return NextResponse.json({ message: 'Challenge has expired' }, { status: 400 });
  }

  // Find participant
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participant = challenge.participants.find(
    (p: any) => p.userId.toString() === userId.toString(),
  );
  if (!participant) {
    return NextResponse.json({ message: 'You are not a participant in this challenge' }, { status: 403 });
  }

  // Check if already playing (session already created)
  if (participant.sessionId) {
    return NextResponse.json({ message: 'You have already started this challenge' }, { status: 400 });
  }

  if (participant.status === 'completed') {
    return NextResponse.json({ message: 'You have already completed this challenge' }, { status: 400 });
  }

  // Fetch the flashcard set
  const flashcardSet = await FlashcardSet.findById(challenge.flashcardSetId).lean();
  if (!flashcardSet) {
    return NextResponse.json({ message: 'Flashcard set not found' }, { status: 404 });
  }

  // Get the specific cards in challenge order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCards = (flashcardSet as any).flashcards || [];
  const cardIdSet = new Set(challenge.cardIds);
  const cardMap = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allCards.map((c: any) => [c._id.toString(), c]),
  );

  const orderedCards = challenge.cardIds
    .map((cardId: string) => cardMap.get(cardId))
    .filter(Boolean);

  // Create a study session
  const sessionId = crypto.randomUUID();
  await StudySession.create({
    sessionId,
    userId,
    listId: challenge.flashcardSetId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setName: (flashcardSet as any).title,
    startTime: new Date(),
    status: 'active',
    totalCards: orderedCards.length,
    correctCount: 0,
    incorrectCount: 0,
    completedCards: 0,
    studyDirection: challenge.studyDirection,
  });

  // Update participant with session ID
  participant.sessionId = sessionId;
  await challenge.save();

  return NextResponse.json({
    sessionId,
    challengeId: challenge._id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    flashcards: orderedCards.map((c: any) => ({
      _id: c._id.toString(),
      front: c.front,
      back: c.back,
    })),
    studyMode: challenge.studyMode,
    studyDirection: challenge.studyDirection,
  });
}
