import { applyAttempt, emptyRollup } from '@/lib/api/masteryRollup';

describe('masteryRollup state machine', () => {
  it('starts as exposed with no attempts', () => {
    const r = emptyRollup();
    expect(r.state).toBe('exposed');
    expect(r.recentFirstAttempts).toEqual([]);
    expect(r.firstAttemptCorrectRate).toBe(0);
    expect(r.attemptCount).toBe(0);
    expect(r.firstAttemptCount).toBe(0);
  });

  it('moves exposed → practiced on the first attempt regardless of correctness', () => {
    const next = applyAttempt(emptyRollup(), { isFirstAttempt: true, isCorrect: false });
    expect(next.state).toBe('practiced');
    expect(next.attemptCount).toBe(1);
    expect(next.firstAttemptCount).toBe(1);
    expect(next.recentFirstAttempts).toEqual([false]);
  });

  it('does not promote to demonstrated until the rolling window is full', () => {
    let r = emptyRollup();
    for (let i = 0; i < 4; i++) {
      r = applyAttempt(r, { isFirstAttempt: true, isCorrect: true });
    }
    expect(r.state).toBe('practiced');
    expect(r.recentFirstAttempts.length).toBe(4);
    expect(r.firstAttemptCorrectRate).toBe(1);
  });

  it('promotes to demonstrated on the 5th first-attempt at 5/5 (≥80%)', () => {
    let r = emptyRollup();
    for (let i = 0; i < 5; i++) {
      r = applyAttempt(r, { isFirstAttempt: true, isCorrect: true });
    }
    expect(r.state).toBe('demonstrated');
    expect(r.firstAttemptCorrectRate).toBe(1);
  });

  it('promotes to demonstrated at 4/5 (= 80%)', () => {
    let r = emptyRollup();
    r = applyAttempt(r, { isFirstAttempt: true, isCorrect: false });
    for (let i = 0; i < 4; i++) {
      r = applyAttempt(r, { isFirstAttempt: true, isCorrect: true });
    }
    expect(r.recentFirstAttempts).toEqual([false, true, true, true, true]);
    expect(r.firstAttemptCorrectRate).toBeCloseTo(0.8);
    expect(r.state).toBe('demonstrated');
  });

  it('does NOT promote at 3/5 (= 60%)', () => {
    let r = emptyRollup();
    r = applyAttempt(r, { isFirstAttempt: true, isCorrect: false });
    r = applyAttempt(r, { isFirstAttempt: true, isCorrect: false });
    r = applyAttempt(r, { isFirstAttempt: true, isCorrect: true });
    r = applyAttempt(r, { isFirstAttempt: true, isCorrect: true });
    r = applyAttempt(r, { isFirstAttempt: true, isCorrect: true });
    expect(r.recentFirstAttempts.length).toBe(5);
    expect(r.firstAttemptCorrectRate).toBeCloseTo(0.6);
    expect(r.state).toBe('practiced');
  });

  it('demonstrated state is sticky — does not regress on later wrong answers', () => {
    let r = emptyRollup();
    for (let i = 0; i < 5; i++) {
      r = applyAttempt(r, { isFirstAttempt: true, isCorrect: true });
    }
    expect(r.state).toBe('demonstrated');

    // Five wrong first-attempts in a row drops the rolling rate to 0,
    // but the state must NOT regress.
    for (let i = 0; i < 5; i++) {
      r = applyAttempt(r, { isFirstAttempt: true, isCorrect: false });
    }
    expect(r.firstAttemptCorrectRate).toBe(0);
    expect(r.state).toBe('demonstrated');
  });

  it('non-first attempts increment attemptCount but not firstAttemptCount or window', () => {
    let r = emptyRollup();
    r = applyAttempt(r, { isFirstAttempt: true, isCorrect: false });
    const before = { ...r };
    r = applyAttempt(r, { isFirstAttempt: false, isCorrect: true });
    expect(r.attemptCount).toBe(before.attemptCount + 1);
    expect(r.firstAttemptCount).toBe(before.firstAttemptCount);
    expect(r.recentFirstAttempts).toEqual(before.recentFirstAttempts);
    expect(r.firstAttemptCorrectRate).toBe(before.firstAttemptCorrectRate);
  });

  it('rolling window evicts oldest first-attempt past size 5', () => {
    let r = emptyRollup();
    // five wrong, then five right — last 5 should be all right.
    for (let i = 0; i < 5; i++) r = applyAttempt(r, { isFirstAttempt: true, isCorrect: false });
    for (let i = 0; i < 5; i++) r = applyAttempt(r, { isFirstAttempt: true, isCorrect: true });
    expect(r.recentFirstAttempts).toEqual([true, true, true, true, true]);
    expect(r.firstAttemptCorrectRate).toBe(1);
    expect(r.state).toBe('demonstrated');
  });
});
