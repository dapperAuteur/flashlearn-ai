/* eslint-disable @typescript-eslint/no-unused-vars */
// app/api/study/sessions/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { Logger, LogContext } from '@/lib/logging/logger';
import { authOptions } from '@/lib/auth/auth';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { User } from '@/models/User';
import { FlashcardSet } from '@/models/FlashcardSet';
import { Profile } from '@/models/Profile';
import StudySession, { StudyDirection } from '@/models/StudySession';

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

function shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await request.json();

  await dbConnect();

  // LOGIC 1: Handle Offline Study Session Synchronization
  if (body.results && body.setId) {
    if (!session?.user?.id) {
        await Logger.warning(LogContext.STUDY, 'Unauthorized attempt to sync study session.');
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const { setId, results } = body;
    const setIdAsObjectId = new mongoose.Types.ObjectId(setId);
    // **FIX: Start the session from Mongoose, not the native client**
    const mongoSession = await mongoose.startSession();
    try {
        let responseData;
        await mongoSession.withTransaction(async () => {
            const user = await User.findById(userId).select('profiles').lean().session(mongoSession) as LeanUser | null;
            if (!user?.profiles?.length) throw new Error(`User profile not found for userId: ${userId}`);
            
            const profileId = user.profiles[0];
            let analytics = await StudyAnalytics.findOne({ profile: profileId, set: setIdAsObjectId }).session(mongoSession);
            if (!analytics) {
                analytics = new StudyAnalytics({
                    profile: profileId,
                    set: setIdAsObjectId,
                    cardPerformance: [],
                    setPerformance: { totalStudySessions: 0, totalTimeStudied: 0, averageScore: 0 },
                });
            }

            let totalSessionTime = 0;
            for (const result of results as CardResult[]) {
                totalSessionTime += result.timeStudied;
                const cardPerf = analytics.cardPerformance.find((p: any) => p.cardId.toString() === result.cardId);
                if (cardPerf) {
                    cardPerf.totalTimeStudied += result.timeStudied;
                    if (result.isCorrect) cardPerf.correctCount++; else cardPerf.incorrectCount++;
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
            analytics.setPerformance.averageScore = (totalCorrect + totalIncorrect) > 0 ? (totalCorrect / (totalCorrect + totalIncorrect)) * 100 : 0;

            await analytics.save({ session: mongoSession });
            responseData = { message: 'Sync successful', analyticsId: analytics._id.toString() };
        });

        await Logger.info(LogContext.STUDY, `Successfully synced study session for set ${setId}.`, { userId, metadata: { setId, resultsCount: results.length } });
        return NextResponse.json(responseData, { status: 200 });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await Logger.error(LogContext.STUDY, `Failed to sync study session for set ${setId}.`, { userId, metadata: { error: errorMessage } });
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    } finally {
        await mongoSession.endSession();
    }
  }

  // LOGIC 2: Handle Creating a New Study Session
  if (body.listId) {
    const requestId = await Logger.info(LogContext.STUDY, "Create study session request");
    try {
        const { listId, studyDirection }: { listId: string, studyDirection: StudyDirection } = body;
        
        // **FIX: Build query using Mongoose models, not the native driver**
        const findQuery: mongoose.FilterQuery<typeof FlashcardSet> = { _id: new mongoose.Types.ObjectId(listId) };
        if (session?.user?.id) {
            const userId = new mongoose.Types.ObjectId(session.user.id);
            const userProfiles = await Profile.find({ user: userId }).select('_id').lean();
            const userProfileIds = userProfiles.map(p => p._id);
            findQuery.$or = [ { isPublic: true }, { profile: { $in: userProfileIds } } ];
        } else {
            findQuery.isPublic = true;
        }
        const flashcardSet = await FlashcardSet.findOne(findQuery);
        
        if (!flashcardSet) {
            await Logger.warning(LogContext.STUDY, "Flashcard set not found or access denied", { requestId, userId: session?.user?.id, listId });
            return NextResponse.json({ error: "Flashcard set not found or you do not have permission to access it." }, { status: 404 });
        }
        
        const flashcards = flashcardSet.flashcards || [];
        if (flashcards.length === 0) {
            return NextResponse.json({ error: "This flashcard set contains no cards." }, { status: 400 });
        }
        
        shuffleArray(flashcards);
        // **FIX: Use Mongoose model to create the new session document**
        const newSession = await StudySession.create({
            userId: session?.user?.id ? new mongoose.Types.ObjectId(session.user.id) : new mongoose.Types.ObjectId(),
            listId: new mongoose.Types.ObjectId(listId),
            startTime: new Date(),
            status: 'active',
            totalCards: flashcards.length,
            studyDirection: studyDirection || 'front-to-back',
        });
        
        await Logger.info(LogContext.STUDY, "Study session created successfully", { requestId, userId: session?.user?.id, metadata: { sessionId: newSession._id.toString(), studyDirection, cardCount: flashcards.length } });
        
        return NextResponse.json({
            sessionId: newSession._id.toString(),
            setName: flashcardSet.title,
            flashcards: flashcards.map((card: any) => ({ _id: card._id.toString(), front: card.front, back: card.back }))
        });
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await Logger.error(LogContext.STUDY, `Error creating study session: ${errorMessage}`, { requestId });
        return NextResponse.json({ error: "Failed to create study session" }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Invalid request body. Provide either 'listId' or 'results' and 'setId'." }, { status: 400 });
}