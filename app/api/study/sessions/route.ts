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
import { StudyDirection, StudySession } from '@/models/StudySession';
import { CardResult } from '@/models/CardResult';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';
import { calculateSM2 } from '@/lib/algorithms/sm2';

interface CardResult {
  cardId: string;
  flashcardId?: string;
  isCorrect: boolean;
  timeSeconds: number;
  confidenceRating?: number;
}

interface SyncPayload {
  setId: string;
  results: CardResult[];
}

interface LeanUser {
  _id: mongoose.Types.ObjectId;
  profiles: mongoose.Types.ObjectId[];
}

// Helper function to determine if user is paid (implement based on your user model)
async function isUserPaid(userId: string): Promise<boolean> {
  try {
    const user = await User.findById(userId).select('subscriptionTier');
    return user?.subscriptionTier === 'Lifetime Learner';
  } catch (error) {
    Logger.error(LogContext.STUDY, 'Error checking user subscription status', { userId, error });
    return false; // Default to free tier on error
  }
}
// Helper function to update confidence data
function updateConfidenceData(confidenceData: any, confidenceRating: number, isCorrect: boolean) {
  if (!confidenceRating || confidenceRating < 1 || confidenceRating > 5) return;
  // Update average confidence - fix TypeScript typing
  const distributionValues = Object.values(confidenceData.confidenceDistribution) as number[];
  const currentTotal = distributionValues.reduce((sum: number, count: number) => sum + count, 0);
  const currentAverage = confidenceData.averageConfidence || 0;
  const newAverage = ((currentAverage * currentTotal) + confidenceRating) / (currentTotal + 1);
  confidenceData.averageConfidence = newAverage;
  // Update distribution
  const levelKey = `level${confidenceRating}` as keyof typeof confidenceData.confidenceDistribution;
  confidenceData.confidenceDistribution[levelKey] = (confidenceData.confidenceDistribution[levelKey] || 0) + 1;
  // Update special categories
  if (isCorrect && confidenceRating <= 2) {
    confidenceData.luckyGuesses = (confidenceData.luckyGuesses || 0) + 1;
  } else if (isCorrect && confidenceRating >= 4) {
    confidenceData.confidentCorrect = (confidenceData.confidentCorrect || 0) + 1;
  } else if (!isCorrect && confidenceRating >= 4) {
    confidenceData.confidentIncorrect = (confidenceData.confidentIncorrect || 0) + 1;
  }
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
    // Rate limit: 10 session syncs per minute per user
    const rateLimiter = getRateLimiter('study-sync', 10, 60);
    const { success } = await rateLimiter.limit(session.user.id);

    if (!success) {
      await Logger.warning(LogContext.STUDY, 'Rate limit exceeded for study session sync', { 
        userId: session.user.id 
      });
      return NextResponse.json({ 
        message: 'Too many session syncs. Please wait before syncing again.' 
      }, { status: 429 });
    }
    
    const userId = session.user.id;
    const { setId, results } = body;
    const setIdAsObjectId = new mongoose.Types.ObjectId(setId);
    const isPaidUser = await isUserPaid(userId);
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
                    setPerformance: { 
                        totalStudySessions: 0, 
                        totalTimeStudied: 0, 
                        averageScore: 0,
                        overallConfidenceData: {
                            averageConfidence: 0,
                            confidenceDistribution: { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
                            luckyGuesses: 0,
                            confidentCorrect: 0,
                            confidentIncorrect: 0
                        }
                    },
                });
            }

            let totalSessionTime = 0;
            for (const result of results as CardResult[]) {
                totalSessionTime += result.timeSeconds;
                let cardPerf = analytics.cardPerformance.find((p: any) => p.cardId.toString() === result.cardId);
                if (!cardPerf) {
                    // Initialize new card performance with confidence data structure
                    const newCardPerf = {
                        cardId: new mongoose.Types.ObjectId(result.cardId),
                        correctCount: 0,
                        incorrectCount: 0,
                        totalTimeStudied: 0,
                        confidenceData: {
                            averageConfidence: 0,
                            confidenceDistribution: { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
                            luckyGuesses: 0,
                            confidentCorrect: 0,
                            confidentIncorrect: 0
                        }
                    };
                    analytics.cardPerformance.push(newCardPerf);
                    cardPerf = analytics.cardPerformance[analytics.cardPerformance.length - 1];
                }
                // Update basic performance
                cardPerf.totalTimeStudied += result.timeSeconds;
                if (result.isCorrect) cardPerf.correctCount++; else cardPerf.incorrectCount++;
                // Update SM-2 spaced repetition data
                const updatedSM2 = calculateSM2(
                  cardPerf.mlData,
                  result.isCorrect,
                  result.confidenceRating,
                );
                if (!cardPerf.mlData) cardPerf.mlData = {};
                cardPerf.mlData.easinessFactor = updatedSM2.easinessFactor;
                cardPerf.mlData.interval = updatedSM2.interval;
                cardPerf.mlData.repetitions = updatedSM2.repetitions;
                cardPerf.mlData.nextReviewDate = updatedSM2.nextReviewDate;
                // Update confidence data for paid users
                // Update confidence data for authenticated users only
                if (session?.user?.id && result.confidenceRating) {
                    updateConfidenceData(cardPerf.confidenceData, result.confidenceRating, result.isCorrect);
                    updateConfidenceData(analytics.setPerformance.overallConfidenceData, result.confidenceRating, result.isCorrect);
                }
            }
            // Update set-level performance

            analytics.setPerformance.totalStudySessions += 1;
            analytics.setPerformance.totalTimeStudied += totalSessionTime;
            const totalCorrect = analytics.cardPerformance.reduce((sum: number, p: any) => sum + p.correctCount, 0);
            const totalIncorrect = analytics.cardPerformance.reduce((sum: number, p: any) => sum + p.incorrectCount, 0);
            analytics.setPerformance.averageScore = (totalCorrect + totalIncorrect) > 0 ? (totalCorrect / (totalCorrect + totalIncorrect)) * 100 : 0;

            await analytics.save({ session: mongoSession });

            // Persist StudySession document
            const sessionMeta = body.sessionMeta;
            const sessionData: any = {
              sessionId: body.sessionId || `${setId}_${Date.now()}`,
              userId: new mongoose.Types.ObjectId(userId),
              listId: setIdAsObjectId,
              status: 'completed',
              totalCards: sessionMeta?.totalCards ?? results.length,
              correctCount: sessionMeta?.correctCount ?? results.filter((r: CardResult) => r.isCorrect).length,
              incorrectCount: sessionMeta?.incorrectCount ?? results.filter((r: CardResult) => !r.isCorrect).length,
              completedCards: results.length,
              studyDirection: sessionMeta?.studyDirection || 'front-to-back',
            };
            if (sessionMeta?.startTime) sessionData.startTime = new Date(sessionMeta.startTime);
            if (sessionMeta?.endTime) sessionData.endTime = new Date(sessionMeta.endTime);

            await StudySession.findOneAndUpdate(
              { sessionId: sessionData.sessionId },
              { $set: sessionData },
              { upsert: true, session: mongoSession }
            );

            // Persist individual CardResult documents
            const cardResultDocs = results.map((r: CardResult) => ({
              sessionId: sessionData.sessionId,
              setId,
              flashcardId: r.cardId || r.flashcardId,
              isCorrect: r.isCorrect,
              timeSeconds: r.timeSeconds,
              ...(r.confidenceRating && { confidenceRating: r.confidenceRating }),
            }));

            if (cardResultDocs.length > 0) {
              await CardResult.insertMany(cardResultDocs, { session: mongoSession, ordered: false }).catch(() => {
                // Ignore duplicate key errors for re-synced sessions
              });
            }

            responseData = { message: 'Sync successful', analyticsId: analytics._id.toString(), sessionId: sessionData.sessionId };
        });

        await Logger.info(LogContext.STUDY, `Successfully synced study session for set ${setId}.`, { userId, metadata: { setId, resultsCount: results.length, isPaidUser  } });
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
  // Rate limiting for new session creation
  if (body.listId) {
    const requestId = await Logger.info(LogContext.STUDY, "Create study session request");
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    // Rate limit: 20 new sessions per hour per IP
    const rateLimiter = getRateLimiter('study-create', 20, 3600);
    const { success } = await rateLimiter.limit(clientIP);
    
    if (!success) {
      await Logger.warning(LogContext.STUDY, 'Rate limit exceeded for session creation', { 
        ip: clientIP 
      });
      return NextResponse.json({ 
        message: 'Too many session requests. Please wait before starting a new session.' 
      }, { status: 429 });
    }
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
            sessionId: new mongoose.Types.ObjectId().toString(),
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