/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { StudySession } from '@/models/StudySession';
import { CardResult as CardResultModel } from '@/models/CardResult';
import { StudyAnalytics } from '@/models/StudyAnalytics';
import { User } from '@/models/User';
import { Profile } from '@/models/Profile';
import { calculateSM2 } from '@/lib/algorithms/sm2';
import { Logger, LogContext, LogLevel } from '@/lib/logging/logger';

interface SyncCardResult {
  cardId: string;
  isCorrect: boolean;
  timeSeconds: number;
  confidenceRating?: number;
}

interface LeanUser {
  _id: mongoose.Types.ObjectId;
  profiles?: mongoose.Types.ObjectId[];
}

function updateConfidenceData(confidenceData: any, confidenceRating: number, isCorrect: boolean) {
  if (!confidenceRating || confidenceRating < 1 || confidenceRating > 5) return;
  const distributionValues = Object.values(confidenceData.confidenceDistribution) as number[];
  const currentTotal = distributionValues.reduce((sum: number, count: number) => sum + count, 0);
  const currentAverage = confidenceData.averageConfidence || 0;
  confidenceData.averageConfidence = ((currentAverage * currentTotal) + confidenceRating) / (currentTotal + 1);
  const levelKey = `level${confidenceRating}` as keyof typeof confidenceData.confidenceDistribution;
  confidenceData.confidenceDistribution[levelKey] = (confidenceData.confidenceDistribution[levelKey] || 0) + 1;
  if (isCorrect && confidenceRating <= 2) {
    confidenceData.luckyGuesses = (confidenceData.luckyGuesses || 0) + 1;
  } else if (isCorrect && confidenceRating >= 4) {
    confidenceData.confidentCorrect = (confidenceData.confidentCorrect || 0) + 1;
  } else if (!isCorrect && confidenceRating >= 4) {
    confidenceData.confidentIncorrect = (confidenceData.confidentIncorrect || 0) + 1;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      sessionId,
      setId,
      setName,
      totalCards,
      correctCount,
      incorrectCount,
      durationSeconds,
      startTime,
      endTime,
      results = [] as SyncCardResult[],
      studyDirection
    } = body;

    if (!sessionId || !setId) {
      return NextResponse.json({
        error: 'Missing required fields: sessionId and setId'
      }, { status: 400 });
    }

    const userId = session.user.id;

    Logger.log({
      context: LogContext.STUDY,
      level: LogLevel.INFO,
      message: 'Syncing session',
      userId,
      metadata: { sessionId, setId, resultsCount: results.length }
    });

    // ---- 1. Save or update StudySession ----
    const existingSession = await StudySession.findOne({ sessionId });

    if (existingSession) {
      existingSession.completedCards = totalCards;
      existingSession.correctCount = correctCount;
      existingSession.incorrectCount = incorrectCount;
      existingSession.durationSeconds = durationSeconds;
      if (endTime) existingSession.endTime = new Date(endTime);
      existingSession.studyDirection = studyDirection;
      existingSession.status = 'completed';
      await existingSession.save();

      Logger.log({
        context: LogContext.STUDY,
        level: LogLevel.INFO,
        message: 'Study session updated',
        userId,
        metadata: { sessionId }
      });
    } else {
      const newSession = new StudySession({
        sessionId,
        userId,
        listId: setId,
        setName,
        totalCards,
        completedCards: totalCards,
        correctCount,
        incorrectCount,
        durationSeconds,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
        status: 'completed',
        studyDirection: studyDirection || 'front-to-back',
      });
      await newSession.save();

      Logger.log({
        context: LogContext.STUDY,
        level: LogLevel.INFO,
        message: 'Study session created',
        userId,
        metadata: { sessionId }
      });
    }

    // ---- 2. Save card results ----
    let savedResultsCount = 0;
    if (results.length > 0) {
      await CardResultModel.deleteMany({ sessionId });

      const cardResultDocs = results.map((result: SyncCardResult) => ({
        sessionId,
        setId,
        flashcardId: result.cardId,
        isCorrect: result.isCorrect,
        timeSeconds: result.timeSeconds,
        confidenceRating: result.confidenceRating,
      }));

      const insertedResults = await CardResultModel.insertMany(cardResultDocs, { ordered: false }).catch(() => []);
      savedResultsCount = insertedResults.length;
    }

    // ---- 3. Update StudyAnalytics (non-blocking) ----
    try {
      let setIdAsObjectId: mongoose.Types.ObjectId;
      try {
        setIdAsObjectId = new mongoose.Types.ObjectId(setId);
      } catch {
        // setId is not a valid ObjectId — skip analytics
        Logger.warning(LogContext.STUDY, 'Invalid setId for analytics, skipping', { setId });
        return NextResponse.json({
          success: true, sessionId,
          created: !existingSession, updated: !!existingSession,
          cardResultsSaved: savedResultsCount
        });
      }

      const user = await User.findById(userId).select('profiles').lean() as LeanUser | null;
      if (!user) {
        Logger.warning(LogContext.STUDY, 'User not found for analytics', { userId });
        return NextResponse.json({
          success: true, sessionId,
          created: !existingSession, updated: !!existingSession,
          cardResultsSaved: savedResultsCount
        });
      }

      // Self-healing: create profile if missing
      let profileId: mongoose.Types.ObjectId;
      if (!user.profiles || user.profiles.length === 0) {
        Logger.log({
          context: LogContext.STUDY,
          level: LogLevel.INFO,
          message: 'Creating default profile for user during sync',
          userId,
        });
        const newProfile = new Profile({
          user: user._id,
          profileName: 'My Profile',
        });
        await newProfile.save();
        await User.findByIdAndUpdate(user._id, { $push: { profiles: newProfile._id } });
        profileId = newProfile._id;
      } else {
        profileId = user.profiles[0];
      }

      // Find or create analytics document
      let analytics = await StudyAnalytics.findOne({ profile: profileId, set: setIdAsObjectId });
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
              confidentIncorrect: 0,
            },
          },
        });
      }

      // Process each card result for analytics
      let totalSessionTime = 0;
      for (const result of results as SyncCardResult[]) {
        totalSessionTime += result.timeSeconds;

        // Validate cardId before using as ObjectId
        let cardObjectId: mongoose.Types.ObjectId;
        try {
          cardObjectId = new mongoose.Types.ObjectId(result.cardId);
        } catch {
          continue; // Skip invalid card IDs
        }

        let cardPerf = analytics.cardPerformance.find(
          (p: any) => p.cardId.toString() === result.cardId
        );
        if (!cardPerf) {
          analytics.cardPerformance.push({
            cardId: cardObjectId,
            correctCount: 0,
            incorrectCount: 0,
            totalTimeStudied: 0,
            confidenceData: {
              averageConfidence: 0,
              confidenceDistribution: { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 },
              luckyGuesses: 0,
              confidentCorrect: 0,
              confidentIncorrect: 0,
            },
          });
          cardPerf = analytics.cardPerformance[analytics.cardPerformance.length - 1];
        }

        cardPerf.totalTimeStudied += result.timeSeconds;
        if (result.isCorrect) cardPerf.correctCount++;
        else cardPerf.incorrectCount++;

        // Update SM-2 spaced repetition
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

        // Update confidence data
        if (result.confidenceRating) {
          updateConfidenceData(cardPerf.confidenceData, result.confidenceRating, result.isCorrect);
          updateConfidenceData(analytics.setPerformance.overallConfidenceData, result.confidenceRating, result.isCorrect);
        }
      }

      // Update set-level performance
      analytics.setPerformance.totalStudySessions += 1;
      analytics.setPerformance.totalTimeStudied += totalSessionTime;
      const totalCorrect = analytics.cardPerformance.reduce((sum: number, p: any) => sum + p.correctCount, 0);
      const totalIncorrect = analytics.cardPerformance.reduce((sum: number, p: any) => sum + p.incorrectCount, 0);
      analytics.setPerformance.averageScore = (totalCorrect + totalIncorrect) > 0
        ? (totalCorrect / (totalCorrect + totalIncorrect)) * 100
        : 0;

      await analytics.save();

      Logger.log({
        context: LogContext.STUDY,
        level: LogLevel.INFO,
        message: 'Analytics updated during sync',
        userId,
        metadata: { sessionId, setId }
      });
    } catch (analyticsError) {
      // Analytics failure should not block session sync
      Logger.log({
        context: LogContext.STUDY,
        level: LogLevel.ERROR,
        message: 'Analytics update failed during sync (non-blocking)',
        metadata: { error: analyticsError instanceof Error ? analyticsError.message : analyticsError }
      });
    }

    return NextResponse.json({
      success: true,
      sessionId,
      created: !existingSession,
      updated: !!existingSession,
      cardResultsSaved: savedResultsCount
    });

  } catch (error) {
    Logger.log({
      context: LogContext.STUDY,
      level: LogLevel.ERROR,
      message: 'Failed to sync study session',
      metadata: { error: error instanceof Error ? error.message : error }
    });

    return NextResponse.json({
      error: 'Failed to sync session',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
