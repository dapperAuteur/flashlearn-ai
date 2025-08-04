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

interface CardResult {
  cardId: string;
  isCorrect: boolean;
  timeStudied: number;
}

interface SyncPayload {
  setId: string;
  results: CardResult[];
}

interface LeanUser {
  _id: mongoose.Types.ObjectId;
  profiles: mongoose.Types.ObjectId[];
}

/**
 * Shuffles an array in-place using the Fisher-Yates (aka Knuth) shuffle algorithm.
 * @param array The array to shuffle.
 */
function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Swap elements
    }
}


export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await request.json();

  // LOGIC 1: Handle Offline Study Session Synchronization
  if (body.results && body.setId) {
    const payload: SyncPayload = body;
    
    if (!session?.user?.id) {
        await Logger.warning(LogContext.STUDY, 'Unauthorized attempt to sync study session.');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const { setId, results } = payload;

    const mongoSession = await (await clientPromise).startSession();
    try {
        let responseData;
        await mongoSession.withTransaction(async () => {
            const user = await User.findById(userId).select('profiles').lean().session(mongoSession) as LeanUser | null;
            
            if (!user?.profiles?.length) {
                throw new Error(`User profile not found for userId: ${userId}`);
            }
            const profileId = user.profiles[0];

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
                totalSessionTime += result.timeStudied;
                const cardPerf = analytics.cardPerformance.find((p: any) => p.cardId.toString() === result.cardId);
                if (cardPerf) {
                    cardPerf.totalTimeStudied += result.timeStudied;
                    if (result.isCorrect) {
                        cardPerf.correctCount++;
                    } else {
                        cardPerf.incorrectCount++;
                    }
                } else {
                    analytics.cardPerformance.push({
                        cardId: new mongoose.Types.ObjectId(result.cardId),
                        correctCount: result.isCorrect ? 1 : 0,
                        incorrectCount: result.isCorrect ? 0 : 1,
                        totalTimeStudied: result.timeStudied,
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
            responseData = { message: 'Sync successful', analyticsId: analytics._id.toString() };
        });

        await Logger.info(LogContext.STUDY, `Successfully synced study session for set ${setId}.`, { userId, metadata: { setId, resultsCount: results.length } });
        return NextResponse.json(responseData, { status: 200 });

    } catch (error) {
        await Logger.error(LogContext.STUDY, `Failed to sync study session for set ${setId}.`, { userId, metadata: { error: error instanceof Error ? error.message : 'Unknown error' } });
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    } finally {
        await mongoSession.endSession();
    }
  }

  // LOGIC 2: Handle Creating a New Study Session
  if (body.listId) {
    const requestId = await Logger.info(LogContext.STUDY, "Create study session request");
    try {
        const userId = session?.user?.id ? new ObjectId(session.user.id) : null;
        const { listId } = body;

        const client = await clientPromise;
        const db = client.db();
        
        const findQuery: any = { _id: new ObjectId(listId) };
        if (userId) {
            findQuery.$or = [{ isPublic: true }, { userId: userId }];
        } else {
            findQuery.isPublic = true;
        }

        const flashcardSet = await db.collection('flashcard_sets').findOne(findQuery);
        if (!flashcardSet) {
            await Logger.warning(LogContext.STUDY, "Flashcard set not found or access denied", { requestId, userId: userId?.toString(), listId });
            return NextResponse.json({ error: "Flashcard set not found or you do not have permission to access it." }, { status: 404 });
        }
        
        const flashcards = flashcardSet.flashcards || [];
        if (flashcards.length === 0) {
            return NextResponse.json({ error: "This flashcard set contains no cards." }, { status: 400 });
        }
        
        // ** NEW: Shuffle the flashcards before sending them to the client **
        shuffleArray(flashcards);

        const studySession = {
            userId: userId || new ObjectId(),
            listId: new ObjectId(listId),
            startTime: new Date(),
            status: 'active',
            totalCards: flashcards.length,
            correctCount: 0,
            incorrectCount: 0,
            completedCards: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        const result = await db.collection('studySessions').insertOne(studySession);
        
        await Logger.info(LogContext.STUDY, "Study session created successfully", { requestId, userId: session?.user?.id, isAnonymous: !userId, metadata: { sessionId: result.insertedId.toString(), cardCount: flashcards.length } });
        
        return NextResponse.json({
            sessionId: result.insertedId.toString(),
            flashcards: flashcards.map((card: any) => ({ _id: card._id.toString(), front: card.front, back: card.back, frontImage: card.frontImage, backImage: card.backImage }))
        });
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await Logger.error(LogContext.STUDY, `Error creating study session: ${errorMessage}`, { requestId });
        return NextResponse.json({ error: "Failed to create study session" }, { status: 500 });
    }
  }

  // If the payload is invalid
  return NextResponse.json({ error: "Invalid request body. Provide either 'listId' or 'results' and 'setId'." }, { status: 400 });
}
