/**
 * Deterministic generators for single-digit math fact sets.
 *
 * The facts are split into small practice sets rather than one wall of 121
 * cards, because a student who is stuck on the 7s should be able to drill the 7s
 * on their own. Every set holds 11 cards, which is one number crossed with 0
 * through 10.
 *
 * Addition and multiplication get two sets per number, one for each position of
 * that number in the problem. The 1s in addition, for example, are "1 + 0 to
 * 1 + 10" and "0 + 1 to 10 + 1", 22 cards across two sets, so recall is drilled
 * in both directions instead of leaning on commutativity.
 *
 * Subtraction and division are generated as the exact inverses of addition and
 * multiplication, which keeps every answer a whole number from 0 to 10. They
 * group by the number being taken away or divided by, one set each.
 *
 * Set and card counts:
 *   addition        22 sets x 11 = 242 cards (121 distinct facts, each in 2 sets)
 *   subtraction     11 sets x 11 = 121 cards
 *   multiplication  22 sets x 11 = 242 cards (121 distinct facts, each in 2 sets)
 *   division        10 sets x 11 = 110 cards (divisor 1-10; dividing by zero is undefined)
 *
 * A card carries a question and an answer, and nothing else. Fact fluency is
 * recall: the skill being drilled is producing 49 from "7 x 7", and picking 49
 * out of four numbers is an easier task a student can pass without knowing the
 * fact. Those answers feed SM-2 scheduling, so a card cleared by recognition
 * would be scheduled as mastered and stop coming back. Authored multiple-choice
 * options were removed for that reason, and the study picker turns multiple
 * choice off for these sets. Please do not add them back.
 *
 * Nothing here touches the network, a clock, or a random source. The same input
 * always produces byte-identical cards, which is what lets the seed script
 * re-run safely.
 */

export type MathFactOperation = 'addition' | 'subtraction' | 'multiplication' | 'division';

export interface MathFactCard {
  /** Stable id so a re-seed updates a card instead of duplicating it. */
  externalId: string;
  front: string;
  back: string;
}

export interface MathFactSet {
  /** Stable key used by the seed script to find an existing set. */
  slug: string;
  operation: MathFactOperation;
  /** The number this set drills, or -1 for a set that is not about one number. */
  focusNumber: number;
  title: string;
  description: string;
  tags: string[];
  cards: MathFactCard[];
}

/** Highest operand drilled in every set. */
export const MAX_OPERAND = 10;

/** Cards per set: one focus number crossed with 0 through 10. */
export const CARDS_PER_SET = MAX_OPERAND + 1;

const OPERATION_SYMBOL: Record<MathFactOperation, string> = {
  addition: '+',
  subtraction: '-',
  multiplication: '×',
  division: '÷',
};

const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

const ID_PREFIX: Record<MathFactOperation, string> = {
  addition: 'add',
  subtraction: 'sub',
  multiplication: 'mul',
  division: 'div',
};

const ID_SEPARATOR: Record<MathFactOperation, string> = {
  addition: '+',
  subtraction: '-',
  multiplication: 'x',
  division: '/',
};

function makeCard(
  operation: MathFactOperation,
  left: number,
  right: number,
  answer: number,
): MathFactCard {
  return {
    externalId: `math:${ID_PREFIX[operation]}:${left}${ID_SEPARATOR[operation]}${right}`,
    front: `${left} ${OPERATION_SYMBOL[operation]} ${right} = ?`,
    back: String(answer),
  };
}

/** One addition card, a + b. */
function additionCard(a: number, b: number): MathFactCard {
  return makeCard('addition', a, b, a + b);
}

/**
 * One subtraction card, written as (answer + subtrahend) - subtrahend so the
 * answer is always a whole number from 0 to 10.
 */
function subtractionCard(answer: number, subtrahend: number): MathFactCard {
  return makeCard('subtraction', answer + subtrahend, subtrahend, answer);
}

/** One multiplication card, a x b. */
function multiplicationCard(a: number, b: number): MathFactCard {
  return makeCard('multiplication', a, b, a * b);
}

/**
 * One division card, written as (quotient x divisor) / divisor. Divisors start
 * at 1 because division by zero has no answer to drill.
 */
function divisionCard(quotient: number, divisor: number): MathFactCard {
  return makeCard('division', quotient * divisor, divisor, quotient);
}

const OPERATION_LABEL: Record<MathFactOperation, string> = {
  addition: 'Addition',
  subtraction: 'Subtraction',
  multiplication: 'Multiplication',
  division: 'Division',
};

/** Fixed per-operation seeds, so each operation shuffles differently but repeatably. */
const OPERATION_SEED: Record<MathFactOperation, number> = {
  addition: 17,
  subtraction: 29,
  multiplication: 41,
  division: 53,
};

const TAGS: Record<MathFactOperation, string[]> = {
  addition: ['math', 'math-facts', 'addition', 'fluency', 'elementary'],
  subtraction: ['math', 'math-facts', 'subtraction', 'fluency', 'elementary'],
  multiplication: ['math', 'math-facts', 'multiplication', 'times-tables', 'elementary'],
  division: ['math', 'math-facts', 'division', 'times-tables', 'elementary'],
};

function set(
  operation: MathFactOperation,
  focusNumber: number,
  slugSuffix: string,
  title: string,
  description: string,
  cards: MathFactCard[],
): MathFactSet {
  const slug = `math-facts-${operation}-${slugSuffix}`;

  return {
    slug,
    operation,
    focusNumber,
    title,
    description,
    tags: [...TAGS[operation], slug],
    cards,
  };
}

/** Addition: two sets per number, one for each position in the problem. */
export function additionSets(max: number = MAX_OPERAND): MathFactSet[] {
  const sets: MathFactSet[] = [];

  for (const n of range(0, max)) {
    sets.push(
      set(
        'addition',
        n,
        `${n}-plus-each`,
        `Addition Facts: ${n} + 0 to ${n} + 10`,
        `The ${CARDS_PER_SET} addition facts that start with ${n}, from ${n} + 0 through ${n} + 10.`,
        range(0, max).map((b) => additionCard(n, b)),
      ),
      set(
        'addition',
        n,
        `each-plus-${n}`,
        `Addition Facts: 0 + ${n} to 10 + ${n}`,
        `The ${CARDS_PER_SET} addition facts that end with ${n}, from 0 + ${n} through 10 + ${n}. Pair it with "${n} + 0 to ${n} + 10" to drill the ${n}s in both directions.`,
        range(0, max).map((a) => additionCard(a, n)),
      ),
    );
  }

  return sets;
}

/** Subtraction: one set per number being taken away. */
export function subtractionSets(max: number = MAX_OPERAND): MathFactSet[] {
  return range(0, max).map((n) =>
    set(
      'subtraction',
      n,
      `minus-${n}`,
      `Subtraction Facts: ${n} - ${n} to ${n + max} - ${n}`,
      `The ${CARDS_PER_SET} subtraction facts that take away ${n}. Every answer is a whole number from 0 to 10, so this set is the exact inverse of the ${n}s in addition.`,
      range(0, max).map((answer) => subtractionCard(answer, n)),
    ),
  );
}

/** Multiplication: two sets per number, one for each position in the problem. */
export function multiplicationSets(max: number = MAX_OPERAND): MathFactSet[] {
  const sets: MathFactSet[] = [];

  for (const n of range(0, max)) {
    sets.push(
      set(
        'multiplication',
        n,
        `${n}-times-each`,
        `Multiplication Facts: ${n} × 0 to ${n} × 10`,
        `The ${n} times table, from ${n} × 0 through ${n} × 10. Recall each product rather than working it out by adding, which is what makes the table fast.`,
        range(0, max).map((b) => multiplicationCard(n, b)),
      ),
      set(
        'multiplication',
        n,
        `each-times-${n}`,
        `Multiplication Facts: 0 × ${n} to 10 × ${n}`,
        `The ${CARDS_PER_SET} multiplication facts that end with ${n}, from 0 × ${n} through 10 × ${n}. Pair it with the ${n} times table to drill the ${n}s in both directions.`,
        range(0, max).map((a) => multiplicationCard(a, n)),
      ),
    );
  }

  return sets;
}

/** Division: one set per divisor. There is no dividing by zero. */
export function divisionSets(max: number = MAX_OPERAND): MathFactSet[] {
  return range(1, max).map((n) =>
    set(
      'division',
      n,
      `by-${n}`,
      `Division Facts: 0 ÷ ${n} to ${max * n} ÷ ${n}`,
      `The ${CARDS_PER_SET} division facts with a divisor of ${n}. Every quotient is a whole number from 0 to 10, so this set is the exact inverse of the ${n} times table.`,
      range(0, max).map((quotient) => divisionCard(quotient, n)),
    ),
  );
}


/**
 * A deterministic shuffle. The module must produce byte-identical output on
 * every run so the seed stays safe to re-run, which rules out Math.random. A
 * small linear congruential generator seeded per set gives a fixed but
 * well-mixed order, which is all interleaved practice needs.
 */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let state = seed * 2654435761 + 1;

  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

/** Cards per mixed-practice set. Inside the 10 to 20 a study set should hold. */
const MIXED_SET_SIZE = 15;

/** How many interleaved review sets each operation gets. */
const MIXED_SET_COUNT = 3;

/** Every fact for one operation, ungrouped, in generation order. */
function allCardsFor(operation: MathFactOperation, max: number = MAX_OPERAND): MathFactCard[] {
  const range0 = range(0, max);

  switch (operation) {
    case 'addition':
      return range0.flatMap((a) => range0.map((b) => additionCard(a, b)));
    case 'multiplication':
      return range0.flatMap((a) => range0.map((b) => multiplicationCard(a, b)));
    case 'subtraction':
      return range0.flatMap((s) => range0.map((answer) => subtractionCard(answer, s)));
    case 'division':
      return range(1, max).flatMap((d) => range0.map((q) => divisionCard(q, d)));
  }
}

/**
 * Interleaved practice. The per-number sets teach one family at a time, which is
 * how a fact is learned; recalling it among unrelated facts is a different skill
 * and the one that shows up on a test. These sets mix the whole pool.
 *
 * Deliberately a sample rather than full coverage: the family sets already cover
 * every fact, so what is wanted here is variety, not another 121 cards.
 */
export function mixedReviewSets(operation: MathFactOperation): MathFactSet[] {
  const pool = seededShuffle(allCardsFor(operation), OPERATION_SEED[operation]);

  return Array.from({ length: MIXED_SET_COUNT }, (_, i) => {
    const cards = pool.slice(i * MIXED_SET_SIZE, (i + 1) * MIXED_SET_SIZE);
    const n = i + 1;

    return set(
      operation,
      -1,
      `mixed-${n}`,
      `${OPERATION_LABEL[operation]} Facts: Mixed Review ${n}`,
      `${MIXED_SET_SIZE} ${operation} facts drawn from across the whole range, in no particular order. Practise this once the single-number sets feel easy: recalling a fact on its own and recalling it among unrelated facts are different skills.`,
      cards,
    );
  });
}

/**
 * The two patterns worth their own set because students learn them as patterns
 * rather than as separate facts.
 */
export function patternSets(): MathFactSet[] {
  const doubles = range(0, MAX_OPERAND).map((n) => additionCard(n, n));
  const makeTen = range(0, MAX_OPERAND).map((a) => additionCard(a, MAX_OPERAND - a));
  const squares = range(0, MAX_OPERAND).map((n) => multiplicationCard(n, n));

  return [
    set(
      'addition',
      -1,
      'doubles',
      'Addition Facts: Doubles',
      'Every double from 0 + 0 to 10 + 10. Students usually learn these as one pattern rather than eleven separate facts, and the near doubles fall out of them.',
      doubles,
    ),
    set(
      'addition',
      -1,
      'make-ten',
      'Addition Facts: Ways to Make 10',
      'Every pair that adds to 10. Worth its own set because so much later arithmetic leans on knowing these without counting.',
      makeTen,
    ),
    set(
      'multiplication',
      -1,
      'squares',
      'Multiplication Facts: Squares',
      'Every square from 0 × 0 to 10 × 10. The anchor facts of the times tables, and the ones a student can use to work out a neighbour.',
      squares,
    ),
  ];
}


/**
 * Subtraction grouped by the number you subtract FROM, rather than by the number
 * you take away.
 *
 * `subtractionSets` answers "what is minus 3", which is the inverse of the
 * addition families. This answers "what are the ways to break up 12", which is
 * how many curricula teach it and how a student reasons about regrouping.
 * Together they cover the same 121 facts from both directions.
 *
 * Group sizes are uneven by nature: there is exactly one way to make 0 and
 * eleven ways to make 10. Adjacent totals are therefore merged until every set
 * lands inside the 10 to 20 a study set should hold, which is why some sets
 * cover one total and others cover five.
 */
const MINUEND_GROUPS: number[][] = [
  [0, 1, 2, 3, 4],
  [5, 6],
  [7, 8],
  [9],
  [10],
  [11],
  [12, 13],
  [14, 15],
  [16, 17, 18, 19, 20],
];

function describeGroup(minuends: number[]): string {
  if (minuends.length === 1) return `${minuends[0]}`;
  if (minuends.length === 2) return `${minuends[0]} or ${minuends[1]}`;
  return `${minuends[0]} to ${minuends[minuends.length - 1]}`;
}

export function minuendSets(max: number = MAX_OPERAND): MathFactSet[] {
  return MINUEND_GROUPS.map((minuends) => {
    // For a total m, every subtrahend that leaves an answer still inside 0..max.
    const cards = minuends.flatMap((m) =>
      range(0, max)
        .filter((subtrahend) => m - subtrahend >= 0 && m - subtrahend <= max)
        .map((subtrahend) => subtractionCard(m - subtrahend, subtrahend)),
    );

    const label = describeGroup(minuends);
    const slugPart = minuends.length === 1 ? `${minuends[0]}` : `${minuends[0]}-${minuends[minuends.length - 1]}`;

    return set(
      'subtraction',
      minuends.length === 1 ? minuends[0] : -1,
      `from-${slugPart}`,
      `Subtraction Facts: Take from ${label}`,
      `Every way to subtract from ${label}. Grouped by the total rather than by what is taken away, which is how a student reasons about breaking a number apart.`,
      cards,
    );
  });
}

/** Every math fact set, in the order they should appear to a student. */
export function mathFactSets(): MathFactSet[] {
  return [
    ...additionSets(),
    ...subtractionSets(),
    ...minuendSets(),
    ...multiplicationSets(),
    ...divisionSets(),
    ...patternSets(),
    ...mixedReviewSets('addition'),
    ...mixedReviewSets('subtraction'),
    ...mixedReviewSets('multiplication'),
    ...mixedReviewSets('division'),
  ];
}
