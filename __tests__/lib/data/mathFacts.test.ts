import {
  additionSets,
  minuendSets,
  mixedReviewSets,
  patternSets,
  CARDS_PER_SET,
  divisionSets,
  mathFactSets,
  multiplicationSets,
  subtractionSets,
} from '@/lib/data/math-facts';

const OPERATORS: Record<string, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => a / b,
};

describe('math fact sets', () => {
  const sets = mathFactSets();

  it('produces the per-number families, the minuend groups, the patterns, and mixed review', () => {
    expect(additionSets()).toHaveLength(22);
    expect(subtractionSets()).toHaveLength(11);
    expect(multiplicationSets()).toHaveLength(22);
    expect(divisionSets()).toHaveLength(10);
    expect(minuendSets()).toHaveLength(9);
    expect(patternSets()).toHaveLength(3);
    expect(mixedReviewSets('addition')).toHaveLength(3);
    // 65 family sets + 9 minuend + 3 pattern + 12 mixed review.
    expect(sets).toHaveLength(89);
  });

  it('keeps every set inside the 10 to 20 range a study set should hold', () => {
    for (const set of sets) {
      expect(set.cards.length).toBeGreaterThanOrEqual(10);
      expect(set.cards.length).toBeLessThanOrEqual(20);
    }
  });

  it('gives every per-number family exactly one focus number crossed with 0 to 10', () => {
    for (const set of [...additionSets(), ...subtractionSets(), ...multiplicationSets(), ...divisionSets()]) {
      expect(set.cards).toHaveLength(CARDS_PER_SET);
    }
  });

  it('regroups subtraction by total without gaining or losing a fact', () => {
    const bySubtrahend = new Set(subtractionSets().flatMap((s) => s.cards.map((c) => c.externalId)));
    const byMinuend = new Set(minuendSets().flatMap((s) => s.cards.map((c) => c.externalId)));

    // Same 121 facts seen from the other direction, so a student can drill
    // "minus 3" or "ways to break up 12" and meet the same material.
    expect(byMinuend.size).toBe(121);
    expect([...byMinuend].sort()).toEqual([...bySubtrahend].sort());
  });

  it('interleaves mixed review instead of accidentally grouping it', () => {
    for (const operation of ['addition', 'subtraction', 'multiplication', 'division'] as const) {
      for (const set of mixedReviewSets(operation)) {
        // A set that happened to hold one number's family would defeat the
        // point, which is recalling a fact away from its neighbours.
        const leftOperands = new Set(set.cards.map((c) => c.front.split(' ')[0]));
        expect(leftOperands.size).toBeGreaterThan(3);
      }
    }
  });

  it('builds the pattern sets from the patterns they claim', () => {
    const [doubles, makeTen, squares] = patternSets();

    expect(doubles.cards.map((c) => c.front)).toContain('7 + 7 = ?');
    expect(doubles.cards.every((c) => {
      const [a, , b] = c.front.split(' ');
      return a === b;
    })).toBe(true);
    expect(makeTen.cards.every((c) => Number(c.back) === 10)).toBe(true);
    expect(squares.cards.every((c) => {
      const [a, , b] = c.front.split(' ');
      return a === b;
    })).toBe(true);
  });

  it('uses a unique slug per set', () => {
    expect(new Set(sets.map((s) => s.slug)).size).toBe(sets.length);
  });

  it('covers every ordered pair from 0 through 10, not just the low numbers', () => {
    // Enumerated rather than counted. A count can be right while a specific
    // family is missing, and "the 7s are not there" is exactly the kind of gap
    // a total would hide.
    const fronts = new Set(sets.flatMap((s) => s.cards.map((c) => c.front)));
    const missing: string[] = [];

    for (let a = 0; a <= 10; a += 1) {
      for (let b = 0; b <= 10; b += 1) {
        if (!fronts.has(`${a} + ${b} = ?`)) missing.push(`${a} + ${b}`);
        if (!fronts.has(`${a} × ${b} = ?`)) missing.push(`${a} × ${b}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('gives every number 0 through 10 both an addition and a multiplication set', () => {
    for (let n = 0; n <= 10; n += 1) {
      const slugs = sets.map((s) => s.slug);
      expect(slugs).toContain(`math-facts-addition-${n}-plus-each`);
      expect(slugs).toContain(`math-facts-addition-each-plus-${n}`);
      expect(slugs).toContain(`math-facts-multiplication-${n}-times-each`);
      expect(slugs).toContain(`math-facts-multiplication-each-times-${n}`);
    }
  });

  it('covers all 473 distinct facts across the four operations', () => {
    const ids = new Set(sets.flatMap((s) => s.cards.map((c) => c.externalId)));

    // 121 each for addition, subtraction, and multiplication; 110 for division,
    // which has no divisor of zero.
    expect(ids.size).toBe(473);
  });

  it('states the right answer on every card', () => {
    for (const set of sets) {
      for (const card of set.cards) {
        const match = card.front.match(/^(\d+) ([+\-×÷]) (\d+) = \?$/);
        expect(match).not.toBeNull();

        const [, left, symbol, right] = match as RegExpMatchArray;
        expect(card.back).toBe(String(OPERATORS[symbol](Number(left), Number(right))));
      }
    }
  });

  it('offers no answer choices, because fact fluency is recall and not recognition', () => {
    // Picking 49 out of four numbers is an easier task than producing 49, and a
    // student can pass it without knowing the fact. Those answers drive SM-2
    // scheduling, so a card cleared by recognition would be filed as mastered
    // and stop coming back. If this test fails, options were added back.
    for (const set of sets) {
      for (const card of set.cards) {
        expect(Object.keys(card).sort()).toEqual(['back', 'externalId', 'front']);
        expect('options' in card).toBe(false);
        expect('correctOptionId' in card).toBe(false);
      }
    }
  });

  it('keeps card ids unique inside a set so a re-seed can match them', () => {
    for (const set of sets) {
      expect(new Set(set.cards.map((c) => c.externalId)).size).toBe(set.cards.length);
    }
  });

  it('is deterministic, so re-running the seed rewrites nothing', () => {
    expect(mathFactSets()).toEqual(sets);
  });

  it('drills both orderings of an addition pair in two separate sets', () => {
    const firstPosition = sets.find((s) => s.slug === 'math-facts-addition-1-plus-each');
    const secondPosition = sets.find((s) => s.slug === 'math-facts-addition-each-plus-1');

    expect(firstPosition?.title).toBe('Addition Facts: 1 + 0 to 1 + 10');
    expect(secondPosition?.title).toBe('Addition Facts: 0 + 1 to 10 + 1');
    expect(firstPosition?.cards.map((c) => c.front)).toContain('1 + 10 = ?');
    expect(secondPosition?.cards.map((c) => c.front)).toContain('10 + 1 = ?');
  });

  it('keeps every subtraction answer a whole number from 0 to 10', () => {
    for (const set of subtractionSets()) {
      for (const card of set.cards) {
        expect(Number(card.back)).toBeGreaterThanOrEqual(0);
        expect(Number(card.back)).toBeLessThanOrEqual(10);
      }
    }
  });

  it('never divides by zero', () => {
    for (const set of divisionSets()) {
      for (const card of set.cards) {
        const divisor = Number((card.front.match(/÷ (\d+)/) as RegExpMatchArray)[1]);
        expect(divisor).toBeGreaterThan(0);
      }
    }
  });
});
