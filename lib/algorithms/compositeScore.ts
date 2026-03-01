/**
 * Composite Scoring Algorithm for Versus Mode
 *
 * Final score: 0-1000 scale
 *
 * Components:
 *   1. Accuracy (40%, 0-400) - correct / total
 *   2. Speed (25%, 0-250) - avg time per card, sqrt curve
 *   3. Confidence calibration (20%, 0-200) - alignment between confidence and correctness
 *   4. Streak (15%, 0-150) - longest consecutive correct / total
 */

export interface CardAnswer {
  isCorrect: boolean;
  timeSeconds: number;
  confidenceRating: number; // 1-5
}

export interface CompositeScoreResult {
  totalScore: number;
  accuracyScore: number;
  speedScore: number;
  confidenceScore: number;
  streakScore: number;
  accuracy: number;
  averageTimeSeconds: number;
  longestStreak: number;
  confidenceCalibration: number;
}

const WEIGHTS = {
  accuracy: 400,
  speed: 250,
  confidence: 200,
  streak: 150,
} as const;

const SPEED_FAST = 3; // seconds, max speed points
const SPEED_SLOW = 30; // seconds, zero speed points

export function calculateCompositeScore(
  answers: CardAnswer[],
  totalCards: number,
): CompositeScoreResult {
  if (answers.length === 0) {
    return {
      totalScore: 0,
      accuracyScore: 0,
      speedScore: 0,
      confidenceScore: 0,
      streakScore: 0,
      accuracy: 0,
      averageTimeSeconds: 0,
      longestStreak: 0,
      confidenceCalibration: 0,
    };
  }

  // 1. ACCURACY (0-400)
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const accuracy = correctCount / totalCards;
  const accuracyScore = Math.round(accuracy * WEIGHTS.accuracy);

  // 2. SPEED (0-250) - sqrt curve for diminishing returns
  const totalTime = answers.reduce((sum, a) => sum + a.timeSeconds, 0);
  const avgTime = totalTime / answers.length;
  const speedRatio = Math.max(
    0,
    Math.min(1, (SPEED_SLOW - avgTime) / (SPEED_SLOW - SPEED_FAST)),
  );
  const speedScore = Math.round(Math.sqrt(speedRatio) * WEIGHTS.speed);

  // 3. CONFIDENCE CALIBRATION (0-200)
  let calibrationSum = 0;
  for (const answer of answers) {
    const normalizedConfidence = (answer.confidenceRating - 1) / 4; // 0-1
    if (answer.isCorrect) {
      // Correct + high confidence = well calibrated
      calibrationSum += 0.5 + normalizedConfidence * 0.5;
    } else {
      // Incorrect + low confidence = knew you didn't know (good calibration)
      calibrationSum += 0.5 - normalizedConfidence * 0.5;
    }
  }
  const confidenceCalibration = (calibrationSum / answers.length) * 100;
  const confidenceScore = Math.round(
    (calibrationSum / answers.length) * WEIGHTS.confidence,
  );

  // 4. STREAK (0-150)
  let longestStreak = 0;
  let currentStreak = 0;
  for (const answer of answers) {
    if (answer.isCorrect) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  const streakRatio = totalCards > 0 ? longestStreak / totalCards : 0;
  const streakScore = Math.round(streakRatio * WEIGHTS.streak);

  const totalScore = accuracyScore + speedScore + confidenceScore + streakScore;

  return {
    totalScore,
    accuracyScore,
    speedScore,
    confidenceScore,
    streakScore,
    accuracy: accuracy * 100,
    averageTimeSeconds: avgTime,
    longestStreak,
    confidenceCalibration,
  };
}
