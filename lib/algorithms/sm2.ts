/**
 * SM-2 Spaced Repetition Algorithm
 * Based on the SuperMemo 2 algorithm by Piotr Wozniak.
 *
 * Maps study results (isCorrect + confidenceRating) to a 0-5 quality score,
 * then computes updated scheduling parameters.
 */

export interface SM2Data {
  easinessFactor: number;
  interval: number;      // days until next review
  repetitions: number;   // consecutive correct answers
  nextReviewDate: Date;
}

const DEFAULT_SM2: SM2Data = {
  easinessFactor: 2.5,
  interval: 0,
  repetitions: 0,
  nextReviewDate: new Date(),
};

/**
 * Convert isCorrect + confidenceRating to SM-2 quality score (0-5).
 *   incorrect → 0-2 based on confidence (higher confidence on wrong = worse)
 *   correct   → 3-5 based on confidence
 */
function toQuality(isCorrect: boolean, confidenceRating?: number): number {
  if (!isCorrect) {
    if (!confidenceRating || confidenceRating <= 2) return 1;
    if (confidenceRating >= 4) return 0; // confidently wrong is worst
    return 1;
  }
  // correct
  if (!confidenceRating || confidenceRating <= 2) return 3;
  if (confidenceRating === 3) return 4;
  return 5; // confidence >= 4
}

/**
 * Calculate updated SM-2 parameters after a review.
 */
export function calculateSM2(
  current: Partial<SM2Data> | null | undefined,
  isCorrect: boolean,
  confidenceRating?: number,
): SM2Data {
  const prev = {
    easinessFactor: current?.easinessFactor ?? DEFAULT_SM2.easinessFactor,
    interval: current?.interval ?? DEFAULT_SM2.interval,
    repetitions: current?.repetitions ?? DEFAULT_SM2.repetitions,
  };

  const quality = toQuality(isCorrect, confidenceRating);

  let { easinessFactor, interval, repetitions } = prev;

  if (quality >= 3) {
    // Correct answer
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easinessFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect — reset
    repetitions = 0;
    interval = 1;
  }

  // Update easiness factor
  easinessFactor =
    easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easinessFactor < 1.3) easinessFactor = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return { easinessFactor, interval, repetitions, nextReviewDate };
}

export interface CardStateProjection extends SM2Data {
  correctCount: number;
  incorrectCount: number;
  lastResultAt: Date | null;
}

/**
 * Fold the SM-2 algorithm over one card's results in the order they happened.
 * Pure and deterministic, so a per-student card state can be stored as a plain
 * projection of an append-only result ledger and re-ingesting the same results
 * never changes the outcome. Returns the final SM-2 state plus tallies.
 */
export function replaySm2(
  results: { isCorrect: boolean; confidenceRating?: number; occurredAt: Date }[],
): CardStateProjection {
  const ordered = [...results].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  let sm2: SM2Data | null = null;
  let correctCount = 0;
  let incorrectCount = 0;
  let lastResultAt: Date | null = null;

  for (const r of ordered) {
    sm2 = calculateSM2(sm2, r.isCorrect, r.confidenceRating);
    if (r.isCorrect) correctCount += 1;
    else incorrectCount += 1;
    if (!lastResultAt || r.occurredAt.getTime() > lastResultAt.getTime()) lastResultAt = r.occurredAt;
  }

  const finalSm2: SM2Data = sm2 ?? { ...DEFAULT_SM2, nextReviewDate: new Date() };

  return { ...finalSm2, correctCount, incorrectCount, lastResultAt };
}
