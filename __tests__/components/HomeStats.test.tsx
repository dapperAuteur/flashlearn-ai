/**
 * The homepage used to print literal figures about the signed-in visitor: eight
 * cards due, 87% accuracy, a twelve-day streak. Wiring the real endpoints in
 * fixed the lying, and then left a second problem: copy written for zero still
 * reads as a status report about the reader, and it arrived a moment after the
 * loading copy it replaced.
 *
 * So there is one resting state now, with no figure in it, and it covers every
 * case that is not this reader's own number: still loading, nothing due, no
 * sessions yet, request failed. These assertions are that promise. A number
 * appears only when it has been fetched for the person reading it.
 */
import { render, screen, waitFor } from '@testing-library/react';
import {
  AccuracySummary,
  DueCardsSummary,
  HomeStatTile,
  RESTING_ACCURACY_COPY,
  RESTING_DUE_COPY,
  RESTING_STREAK_SENTENCE,
  StreakBadge,
  StreakSentence,
  resetHomeStatsCache,
} from '../../components/home/HomeStats';

const STATS_URL = '/api/study/stats';
const DUE_URL = '/api/study/due-cards';

type StatsBody = {
  overallAccuracy?: number;
  streak?: number;
  totalSessions?: number;
};

function mockEndpoints(stats: StatsBody, totalDue: number) {
  const fetchMock = jest.fn((url: string) => {
    const body = url.startsWith(DUE_URL) ? { totalDue, sets: [] } : stats;
    return Promise.resolve({ ok: true, json: async () => body });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function mockFailure() {
  const fetchMock = jest.fn(() => Promise.reject(new Error('offline')));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

/** Never resolves, so the components stay in their loading state. */
function mockPending() {
  const fetchMock = jest.fn(() => new Promise(() => {}));
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

/** Resolves ok, but with an account that has done nothing yet. */
function mockEmptyAccount() {
  return mockEndpoints({ overallAccuracy: 0, streak: 0, totalSessions: 0 }, 0);
}

beforeEach(() => {
  resetHomeStatsCache();
  jest.restoreAllMocks();
});

describe('real values', () => {
  it('states the cards actually due', async () => {
    mockEndpoints({ overallAccuracy: 64, streak: 3, totalSessions: 9 }, 12);
    render(<DueCardsSummary />);

    expect(
      await screen.findByText('Review 12 cards due for optimal retention'),
    ).toBeInTheDocument();
  });

  it('keeps the sentence readable when exactly one card is due', async () => {
    mockEndpoints({ overallAccuracy: 64, streak: 3, totalSessions: 9 }, 1);
    render(<DueCardsSummary />);

    expect(
      await screen.findByText('Review 1 card due for optimal retention'),
    ).toBeInTheDocument();
  });

  it('states the accuracy the study endpoint reports', async () => {
    mockEndpoints({ overallAccuracy: 64, streak: 3, totalSessions: 9 }, 4);
    render(<AccuracySummary />);

    expect(
      await screen.findByText('64% average accuracy across your sessions'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/87%/)).not.toBeInTheDocument();
  });

  it('states the streak the study endpoint reports', async () => {
    mockEndpoints({ overallAccuracy: 64, streak: 3, totalSessions: 9 }, 4);
    render(<StreakBadge />);

    expect(await screen.findByText('3-day study streak! Keep it up!')).toBeInTheDocument();
    expect(screen.queryByText(/12-day/)).not.toBeInTheDocument();
  });

  it('names the streak in the closing call to action once there is one', async () => {
    mockEndpoints({ overallAccuracy: 64, streak: 3, totalSessions: 9 }, 4);
    render(<StreakSentence />);

    expect(
      await screen.findByText(`You are on a 3-day streak. ${RESTING_STREAK_SENTENCE}`),
    ).toBeInTheDocument();
  });

  it('puts the number and its label in one polite live region on a tile', async () => {
    mockEndpoints({ overallAccuracy: 64, streak: 3, totalSessions: 9 }, 4);
    const { container } = render(
      <HomeStatTile metric="streak" icon={null} iconWrapperClassName="icon" />,
    );

    await screen.findByText('3', { exact: false });
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).toHaveTextContent('3 Day Streak');
  });
});

/**
 * The four states that are not a real figure all have to look the same. They
 * are listed together so a future change cannot quietly give one of them its
 * own sentence again.
 */
describe.each([
  ['while the fetch is still in flight', mockPending],
  ['when the account has no history yet', mockEmptyAccount],
  ['when the request fails', mockFailure],
  [
    'when the endpoint answers with an error status',
    () => {
      const fetchMock = jest.fn(() => Promise.resolve({ ok: false, json: async () => ({}) }));
      global.fetch = fetchMock as unknown as typeof fetch;
      return fetchMock;
    },
  ],
])('the resting state: %s', (_name, mockState) => {
  it('offers the due-cards card without counting anything at the reader', async () => {
    mockState();
    render(<DueCardsSummary />);

    expect(await screen.findByText(RESTING_DUE_COPY)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d/);
  });

  it('offers the progress card without a percentage', async () => {
    mockState();
    render(<AccuracySummary />);

    expect(await screen.findByText(RESTING_ACCURACY_COPY)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d/);
  });

  it('drops the streak pill entirely, since a streak pill is only a number', async () => {
    mockState();
    const { container } = render(<StreakBadge />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('closes with the figure-free call to action', async () => {
    mockState();
    render(<StreakSentence />);

    expect(await screen.findByText(RESTING_STREAK_SENTENCE)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d/);
  });

  it.each(['due', 'accuracy', 'streak', 'sessions'] as const)(
    'leaves the %s tile showing its label and no figure',
    async (metric) => {
      mockState();
      const { container } = render(
        <HomeStatTile metric={metric} icon={null} iconWrapperClassName="icon" />,
      );

      // A short wait lets any state change land, so a tile that flips to a
      // placeholder a tick later still fails this.
      await waitFor(() => expect(document.body.textContent).not.toMatch(/\d/));

      // No word standing in the space a number would take, either.
      expect(screen.queryByText(/Loading|None yet|Unavailable|Nothing/)).not.toBeInTheDocument();

      const region = container.querySelector('[aria-live="polite"]');
      expect(region).toBeInTheDocument();
      // The label is inside the live region from the first render, so the value
      // that arrives later is announced with the thing it counts.
      expect(region?.textContent?.trim()).toBe(
        {
          due: 'Cards Due Today',
          accuracy: 'Average Accuracy',
          streak: 'Day Streak',
          sessions: 'Study Sessions',
        }[metric],
      );
    },
  );
});

describe('no figure survives from the old hardcoded copy', () => {
  it('never falls back to eight cards, 87%, or a twelve-day streak', async () => {
    mockFailure();
    render(
      <>
        <DueCardsSummary />
        <AccuracySummary />
        <StreakBadge />
        <StreakSentence />
      </>,
    );

    await screen.findByText(RESTING_DUE_COPY);
    expect(screen.queryByText(/8 cards/)).not.toBeInTheDocument();
    expect(screen.queryByText(/87%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/12-day/)).not.toBeInTheDocument();
  });
});

describe('cost to the page', () => {
  it('asks each endpoint once no matter how many pieces need the answer', async () => {
    const fetchMock = mockEndpoints({ overallAccuracy: 64, streak: 3, totalSessions: 9 }, 12);

    render(
      <>
        <DueCardsSummary />
        <AccuracySummary />
        <StreakBadge />
        <StreakSentence />
        <HomeStatTile metric="due" icon={null} iconWrapperClassName="icon" />
      </>,
    );

    await screen.findByText('Review 12 cards due for optimal retention');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const requested = fetchMock.mock.calls.map((call) => call[0]);
    expect(requested).toContain(STATS_URL);
    expect(requested).toContain(DUE_URL);
  });
});
