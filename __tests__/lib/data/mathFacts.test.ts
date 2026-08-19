import {
  additionSets,
  buildOptions,
  CARDS_PER_SET,
  divisionSets,
  mathFactSets,
  multiplicationSets,
  pickDistractors,
  subtractionSets,
} from '@/lib/data/math-facts';

const OPERATORS: Record<string, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '×': (a, b) => a * b,
  '÷': (a, b) => a / b,
};

describe('pickDistractors', () => {
  it('returns three wrong answers drawn from the candidate list in order', () => {
    expect(pickDistractors(12, [13, 11, 35, 14])).toEqual([13, 11, 35]);
  });

  it('drops the correct answer, duplicates, negatives, and fractions', () => {
    expect(pickDistractors(5, [5, 6, 6, -1, 2.5, 7])).toEqual([6, 7, 4]);
  });

  it('fills from around the correct answer when candidates run out', () => {
    expect(pickDistractors(0, [])).toEqual([1, 2, 3]);
  });
});

describe('buildOptions', () => {
  it('sorts options low to high and points correctOptionId at the right one', () => {
    const { options, correctOptionId } = buildOptions(12, [13, 11, 35]);

    expect(options).toEqual([
      { id: 'a', text: '11' },
      { id: 'b', text: '12' },
      { id: 'c', text: '13' },
      { id: 'd', text: '35' },
    ]);
    expect(correctOptionId).toBe('b');
  });
});

describe('math fact sets', () => {
  const sets = mathFactSets();

  it('produces 22 addition, 11 subtraction, 22 multiplication, and 10 division sets', () => {
    expect(additionSets()).toHaveLength(22);
    expect(subtractionSets()).toHaveLength(11);
    expect(multiplicationSets()).toHaveLength(22);
    expect(divisionSets()).toHaveLength(10);
    expect(sets).toHaveLength(65);
  });

  it('gives every set 11 cards, inside the 10 to 20 range a study set should hold', () => {
    for (const set of sets) {
      expect(set.cards).toHaveLength(CARDS_PER_SET);
      expect(set.cards.length).toBeGreaterThanOrEqual(10);
      expect(set.cards.length).toBeLessThanOrEqual(20);
    }
  });

  it('uses a unique slug per set', () => {
    expect(new Set(sets.map((s) => s.slug)).size).toBe(sets.length);
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

  it('offers four whole, non-negative, distinct choices with the answer among them', () => {
    for (const set of sets) {
      for (const card of set.cards) {
        expect(card.options).toHaveLength(4);
        expect(new Set(card.options.map((o) => o.text)).size).toBe(4);

        for (const option of card.options) {
          expect(Number(option.text)).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(Number(option.text))).toBe(true);
        }

        const correct = card.options.find((o) => o.id === card.correctOptionId);
        expect(correct?.text).toBe(card.back);
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
