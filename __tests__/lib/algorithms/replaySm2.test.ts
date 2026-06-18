import { replaySm2 } from '@/lib/algorithms/sm2';

const at = (iso: string) => new Date(iso);

describe('replaySm2', () => {
  it('returns the default SM-2 state for no results', () => {
    const s = replaySm2([]);
    expect(s.easinessFactor).toBe(2.5);
    expect(s.interval).toBe(0);
    expect(s.repetitions).toBe(0);
    expect(s.correctCount).toBe(0);
    expect(s.incorrectCount).toBe(0);
    expect(s.lastResultAt).toBeNull();
  });

  it('advances repetitions on a correct answer', () => {
    const s = replaySm2([{ isCorrect: true, occurredAt: at('2026-06-18T10:00:00Z') }]);
    expect(s.repetitions).toBe(1);
    expect(s.interval).toBe(1);
    expect(s.correctCount).toBe(1);
    expect(s.incorrectCount).toBe(0);
  });

  it('resets repetitions on an incorrect answer', () => {
    const s = replaySm2([
      { isCorrect: true, occurredAt: at('2026-06-18T10:00:00Z') },
      { isCorrect: true, occurredAt: at('2026-06-18T11:00:00Z') },
      { isCorrect: false, occurredAt: at('2026-06-18T12:00:00Z') },
    ]);
    expect(s.repetitions).toBe(0);
    expect(s.correctCount).toBe(2);
    expect(s.incorrectCount).toBe(1);
    expect(s.lastResultAt?.toISOString()).toBe('2026-06-18T12:00:00.000Z');
  });

  it('orders by occurredAt regardless of input order (idempotent projection)', () => {
    const results = [
      { isCorrect: true, occurredAt: at('2026-06-18T10:00:00Z') },
      { isCorrect: false, occurredAt: at('2026-06-18T11:00:00Z') },
      { isCorrect: true, occurredAt: at('2026-06-18T12:00:00Z') },
    ];
    const inOrder = replaySm2(results);
    const shuffled = replaySm2([results[2], results[0], results[1]]);
    expect(shuffled.repetitions).toBe(inOrder.repetitions);
    expect(shuffled.easinessFactor).toBe(inOrder.easinessFactor);
    expect(shuffled.interval).toBe(inOrder.interval);
  });

  it('is deterministic: replaying the same ledger twice gives the same state', () => {
    const results = [
      { isCorrect: true, confidenceRating: 5, occurredAt: at('2026-06-18T10:00:00Z') },
      { isCorrect: true, confidenceRating: 4, occurredAt: at('2026-06-18T11:00:00Z') },
    ];
    expect(replaySm2(results)).toEqual(replaySm2(results));
  });
});
