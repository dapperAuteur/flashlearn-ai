/**
 * @jest-environment node
 *
 * The signed-out homepage used to claim "2,000+ active learners" and a "4.9/5
 * average rating". Nothing in the repo backed either one. What replaced them has
 * to hold to a stricter rule than the old copy did: each figure is derived from
 * something a reader could go and check, and a figure that cannot be derived
 * right now does not appear at all.
 *
 * The set count is the interesting case. Asserting it equals 134 would just move
 * the hardcoded number into the test, so these cases change the underlying data
 * and check the count follows.
 */
import { mathFactSets } from '../../lib/data/math-facts';
import { loadReferenceSets } from '../../lib/data/math-reference/loadSets';

jest.mock('../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));

const aggregate = jest.fn();
jest.mock('../../models/StudySession', () => ({
  StudySession: { aggregate: (...args: unknown[]) => aggregate(...args) },
}));

jest.mock('../../lib/data/math-reference/loadSets', () => {
  const actual = jest.requireActual('../../lib/data/math-reference/loadSets');
  return { ...actual, loadReferenceSets: jest.fn(actual.loadReferenceSets) };
});

import {
  ACTIVE_WINDOW_DAYS,
  LEARNER_COUNT_RETRY_MS,
  LEARNER_COUNT_TTL_MS,
} from '../../lib/home/socialProof';
import {
  activeLearnerCount,
  homeSocialProof,
  readyToStudySetCount,
  resetHomeSocialProofCache,
} from '../../lib/home/socialProofCounts';

const loadReferenceSetsMock = loadReferenceSets as jest.MockedFunction<typeof loadReferenceSets>;

beforeEach(() => {
  resetHomeSocialProofCache();
  aggregate.mockReset();
  loadReferenceSetsMock.mockClear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ready-to-study sets', () => {
  it('counts the curated content instead of stating a number someone typed', () => {
    const expected = mathFactSets().length + jest.requireActual(
      '../../lib/data/math-reference/loadSets',
    ).loadReferenceSets().length;

    expect(readyToStudySetCount()).toBe(expected);
    expect(readyToStudySetCount()).toBeGreaterThan(0);
  });

  it('follows the content when the reference files change', () => {
    loadReferenceSetsMock.mockReturnValueOnce([
      { slug: 'a', title: 'A', description: 'A', tags: [], cards: [] },
      { slug: 'b', title: 'B', description: 'B', tags: [], cards: [] },
    ]);

    expect(readyToStudySetCount()).toBe(mathFactSets().length + 2);
  });

  it('reads the content once and reuses the answer', () => {
    readyToStudySetCount();
    readyToStudySetCount();

    expect(loadReferenceSetsMock).toHaveBeenCalledTimes(1);
  });

  it('gives up the claim rather than a guess when the content will not load', () => {
    loadReferenceSetsMock.mockImplementationOnce(() => {
      throw new Error('reference files missing');
    });

    expect(readyToStudySetCount()).toBeNull();
  });
});

describe('active learners', () => {
  it('counts accounts with a completed session inside the window', async () => {
    aggregate.mockResolvedValue([{ learners: 7 }]);

    expect(await activeLearnerCount()).toBe(7);

    const [pipeline] = aggregate.mock.calls[0] as [Array<Record<string, unknown>>];
    const match = pipeline[0].$match as { status: string; startTime: { $gte: Date } };
    expect(match.status).toBe('completed');
    const days = (Date.now() - match.startTime.$gte.getTime()) / (24 * 60 * 60 * 1000);
    expect(Math.round(days)).toBe(ACTIVE_WINDOW_DAYS);
    // Grouped by account before counting, so one busy learner is one learner.
    expect(pipeline[1]).toEqual({ $group: { _id: '$userId' } });
  });

  it('reports a small number as it is, with no floor under it', async () => {
    aggregate.mockResolvedValue([{ learners: 3 }]);

    expect(await activeLearnerCount()).toBe(3);
  });

  it('reports nobody as zero rather than inventing a starting figure', async () => {
    aggregate.mockResolvedValue([]);

    expect(await activeLearnerCount()).toBe(0);
  });

  it('renders no figure at all when the count fails', async () => {
    aggregate.mockRejectedValue(new Error('no database'));

    expect(await activeLearnerCount()).toBeNull();
  });

  it('runs one aggregate for a burst of visits, not one each', async () => {
    aggregate.mockResolvedValue([{ learners: 5 }]);

    const answers = await Promise.all([
      activeLearnerCount(),
      activeLearnerCount(),
      activeLearnerCount(),
    ]);

    expect(answers).toEqual([5, 5, 5]);
    expect(aggregate).toHaveBeenCalledTimes(1);
  });

  it('reuses the count for an hour and then asks again', async () => {
    aggregate.mockResolvedValue([{ learners: 5 }]);
    expect(await activeLearnerCount()).toBe(5);

    const start = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(start + LEARNER_COUNT_TTL_MS - 1000);
    aggregate.mockResolvedValue([{ learners: 9 }]);
    expect(await activeLearnerCount()).toBe(5);
    expect(aggregate).toHaveBeenCalledTimes(1);

    jest.spyOn(Date, 'now').mockReturnValue(start + LEARNER_COUNT_TTL_MS + 1000);
    expect(await activeLearnerCount()).toBe(9);
    expect(aggregate).toHaveBeenCalledTimes(2);
  });

  it('waits out a short cooldown after a failure instead of retrying every visit', async () => {
    aggregate.mockRejectedValue(new Error('no database'));
    expect(await activeLearnerCount()).toBeNull();

    const start = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(start + LEARNER_COUNT_RETRY_MS - 1000);
    expect(await activeLearnerCount()).toBeNull();
    expect(aggregate).toHaveBeenCalledTimes(1);

    jest.spyOn(Date, 'now').mockReturnValue(start + LEARNER_COUNT_RETRY_MS + 1000);
    aggregate.mockResolvedValue([{ learners: 2 }]);
    expect(await activeLearnerCount()).toBe(2);
  });
});

describe('what the page asks for', () => {
  it('hands over both figures in one call', async () => {
    aggregate.mockResolvedValue([{ learners: 4 }]);

    const proof = await homeSocialProof();

    expect(proof.setCount).toBe(readyToStudySetCount());
    expect(proof.activeLearners).toBe(4);
  });

  it('survives a database outage with the countable claim intact', async () => {
    aggregate.mockRejectedValue(new Error('no database'));

    const proof = await homeSocialProof();

    expect(proof.activeLearners).toBeNull();
    expect(proof.setCount).toBeGreaterThan(0);
  });
});
