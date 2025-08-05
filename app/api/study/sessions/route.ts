// app/api/study/sessions/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import clientPromise from '@/lib/db/mongodb';
import { Logger, LogContext } from '@/lib/logging/logger';
import { authOptions } from '@/lib/auth/auth';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { User } from '@/models/User';

// --- INTERFACES ---

interface CardResult {
  flashcardId: string;
  isCorrect: boolean;
  timeSeconds: number;
}

interface SessionWithResults {
  sessionId: string;
  setId: string;
  results: CardResult[];
}

interface LeanUser {
  _id: mongoose.Types.ObjectId;
  profiles: mongoose.Types.ObjectId[];
}

/**
 * Shuffles an array in-place using the Fisher-Yates algorithm.
 * @param array The array to shuffle.
 */
function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    await Logger.warning(LogContext.STUDY, 'Unauthorized API access attempt to study session route.');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const body = await request.json();

  // --- LOGIC 1: Handle BATCH Offline Study Session Synchronization ---
  if (body.sessions && Array.isArray(body.sessions)) {
    const sessionsToSync: SessionWithResults[] = body.sessions;
    
    if (sessionsToSync.length === 0) {
        return NextResponse.json({ message: 'Sync successful, no sessions to process.' }, { status: 200 });
    }

    const mongoSession = await (await clientPromise).startSession();
    try {
        await mongoSession.withTransaction(async () => {
            const user = await User.findById(userId).select('profiles').lean().session(mongoSession) as LeanUser | null;
            if (!user?.profiles?.length) {
                throw new Error(`User profile not found for userId: ${userId}`);
            }
            const profileId = user.profiles[0];

            for (const sessionData of sessionsToSync) {
                const { setId, results } = sessionData;
                if (!setId || !results || results.length === 0) continue; // Skip malformed or empty sessions in batch

                let analytics = await StudyAnalytics.findOne({ profile: profileId, set: setId }).session(mongoSession);
                if (!analytics) {
                    analytics = new StudyAnalytics({
                        profile: profileId,
                        set: setId,
                        cardPerformance: [],
                        setPerformance: { totalStudySessions: 0, totalTimeStudied: 0, averageScore: 0 },
                    });
                }

                let totalSessionTime = 0;
                for (const result of results) {
                    totalSessionTime += result.timeSeconds;
                    const cardPerf = analytics.cardPerformance.find((p: any) => p.cardId.toString() === result.flashcardId);
                    if (cardPerf) {
                        cardPerf.totalTimeStudied += result.timeSeconds;
                        if (result.isCorrect) cardPerf.correctCount++; else cardPerf.incorrectCount++;
                    } else {
                        analytics.cardPerformance.push({
                            cardId: new mongoose.Types.ObjectId(result.flashcardId),
                            correctCount: result.isCorrect ? 1 : 0,
                            incorrectCount: result.isCorrect ? 0 : 1,
                            totalTimeStudied: result.timeSeconds,
                        });
                    }
                }

                analytics.setPerformance.totalStudySessions += 1;
                analytics.setPerformance.totalTimeStudied += totalSessionTime;
                const totalCorrect = analytics.cardPerformance.reduce((sum: number, p: any) => sum + p.correctCount, 0);
                const totalIncorrect = analytics.cardPerformance.reduce((sum: number, p: any) => sum + p.incorrectCount, 0);
                const totalAttempts = totalCorrect + totalIncorrect;
                analytics.setPerformance.averageScore = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

                await analytics.save({ session: mongoSession });
            }
        });

        await Logger.info(LogContext.STUDY, `Successfully synced batch of ${sessionsToSync.length} sessions.`, { userId });
        return NextResponse.json({ message: 'Sync successful' }, { status: 200 });

    } catch (error) {
        await Logger.error(LogContext.STUDY, `Failed to sync session batch.`, { userId, metadata: { error: error instanceof Error ? error.message : 'Unknown error' } });
        return NextResponse.json({ message: 'Internal Server Error during transaction' }, { status: 500 });
    } finally {
        await mongoSession.endSession();
    }
  }

  // --- LOGIC 2: Handle Creating a New Study Session ---
  if (body.listId) {
    const requestId = await Logger.info(LogContext.STUDY, "Create study session request");
    try {
        const { listId } = body;
        const client = await clientPromise;
        const db = client.db();
        
        const findQuery: any = { _id: new ObjectId(listId), $or: [{ isPublic: true }, { 'user._id': new ObjectId(userId) }] };

        const flashcardSet = await db.collection('flashcard_sets').findOne(findQuery);
        if (!flashcardSet) {
            await Logger.warning(LogContext.STUDY, "Flashcard set not found or access denied", { requestId, userId, listId });
            return NextResponse.json({ error: "Flashcard set not found or you do not have permission to access it." }, { status: 404 });
        }
        
        const flashcards = flashcardSet.flashcards || [];
        if (flashcards.length === 0) {
            return NextResponse.json({ error: "This flashcard set contains no cards." }, { status: 400 });
        }
        
        shuffleArray(flashcards);

        return NextResponse.json({
            flashcards: flashcards.map((card: any) => ({ _id: card._id.toString(), front: card.front, back: card.back }))
        });
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await Logger.error(LogContext.STUDY, `Error creating study session: ${errorMessage}`, { requestId });
        return NextResponse.json({ error: "Failed to create study session" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
}
