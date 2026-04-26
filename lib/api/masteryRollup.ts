// Pure domain constants — defined here so the helper (and its tests) have no
// mongoose dependency. The model file re-exports these.
export type MasteryState = 'exposed' | 'practiced' | 'demonstrated';

export const ROLLUP_WINDOW = 5;
export const DEMONSTRATED_THRESHOLD = 0.8;

export interface RollupState {
  state: MasteryState;
  recentFirstAttempts: boolean[];
  firstAttemptCorrectRate: number;
  attemptCount: number;
  firstAttemptCount: number;
}

export interface AttemptInput {
  isFirstAttempt: boolean;
  isCorrect: boolean;
}

// Pure transition function. Given the current rollup state and a new attempt,
// returns the next rollup state. State is sticky on the way up (once
// `demonstrated`, never regresses) per Wanderlearn plan 08 / brief §3.
export function applyAttempt(
  current: RollupState,
  attempt: AttemptInput,
): RollupState {
  const attemptCount = current.attemptCount + 1;
  let firstAttemptCount = current.firstAttemptCount;
  let recentFirstAttempts = current.recentFirstAttempts;
  let firstAttemptCorrectRate = current.firstAttemptCorrectRate;

  if (attempt.isFirstAttempt) {
    firstAttemptCount += 1;
    recentFirstAttempts = [...current.recentFirstAttempts, attempt.isCorrect].slice(-ROLLUP_WINDOW);
    const correctCount = recentFirstAttempts.filter(Boolean).length;
    firstAttemptCorrectRate = recentFirstAttempts.length === 0
      ? 0
      : correctCount / recentFirstAttempts.length;
  }

  // State progression — monotonic on the way up.
  let state: MasteryState = current.state;
  if (state === 'exposed') {
    state = 'practiced';
  }
  if (
    state !== 'demonstrated' &&
    recentFirstAttempts.length === ROLLUP_WINDOW &&
    firstAttemptCorrectRate >= DEMONSTRATED_THRESHOLD
  ) {
    state = 'demonstrated';
  }

  return {
    state,
    recentFirstAttempts,
    firstAttemptCorrectRate,
    attemptCount,
    firstAttemptCount,
  };
}

// Initial state for a freshly-exposed standard (session created but no
// attempts yet).
export function emptyRollup(): RollupState {
  return {
    state: 'exposed',
    recentFirstAttempts: [],
    firstAttemptCorrectRate: 0,
    attemptCount: 0,
    firstAttemptCount: 0,
  };
}
