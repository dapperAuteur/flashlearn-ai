/**
 * The homepage used to print literal figures about the signed-in visitor: eight
 * cards due, 87% accuracy, a twelve-day streak. These assertions are the promise
 * that replaced them. A number appears only when it has been fetched, an empty
 * account reads copy written for zero, and a failed request drops the figure
 * instead of falling back to one.
 */
import { render, screen, waitFor } from '@testing-library/react';
import {
  AccuracySummary,
  DueCardsSummary,
  HomeStatTile,
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

describe('nothing to show yet', () => {
  it('invites a user with no cards due instead of counting zero at them', async () => {
    mockEndpoints({ overallAccuracy: 0, streak: 0, totalSessions: 0 }, 0);
    render(<DueCardsSummary />);

    expect(
      await screen.findByText('Nothing is due today. Study ahead any time.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Review 0 cards/)).not.toBeInTheDocument();
  });

  it('invites a day-one user to start a streak rather than congratulating one', async () => {
    mockEndpoints({ overallAccuracy: 0, streak: 0, totalSessions: 0 }, 0);
    render(<StreakBadge />);

    expect(await screen.findByText('Study today to start your streak')).toBeInTheDocument();
    expect(screen.queryByText(/0-day/)).not.toBeInTheDocument();
  });

  it('separates "no sessions yet" from "scored zero" on accuracy', async () => {
    mockEndpoints({ overallAccuracy: 0, streak: 0, totalSessions: 0 }, 0);
    render(<AccuracySummary />);

    expect(
      await screen.findByText('Study a set to start tracking your accuracy'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/0% average/)).not.toBeInTheDocument();
  });

  it('says None yet on an accuracy tile with no sessions behind it', async () => {
    mockEndpoints({ overallAccuracy: 0, streak: 0, totalSessions: 0 }, 0);
    render(<HomeStatTile metric="accuracy" icon={null} iconWrapperClassName="icon" />);

    expect(await screen.findByText(/None yet/)).toBeInTheDocument();
    expect(screen.queryByText(/0%/)).not.toBeInTheDocument();
  });

  it('offers a first session rather than a streak in the closing call to action', async () => {
    mockEndpoints({ overallAccuracy: 0, streak: 0, totalSessions: 0 }, 0);
    render(<StreakSentence />);

    expect(
      await screen.findByText('Start your streak today with a personalized study session.'),
    ).toBeInTheDocument();
  });
});

describe('while the values are still loading', () => {
  it('shows no figure at all, neither zero nor the old hardcoded one', () => {
    mockPending();
    render(
      <>
        <DueCardsSummary />
        <AccuracySummary />
        <StreakBadge />
      </>,
    );

    expect(screen.getByText('Checking what is ready for review')).toBeInTheDocument();
    expect(screen.getByText('Checking your results')).toBeInTheDocument();
    expect(screen.getByText('Checking your study streak')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d/);
  });

  it('does not let a tile read as the number zero before the fetch lands', () => {
    mockPending();
    render(<HomeStatTile metric="due" icon={null} iconWrapperClassName="icon" />);

    expect(screen.getByText(/Loading/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d/);
  });
});

describe('when the request fails', () => {
  it('drops the figure rather than falling back to a hardcoded one', async () => {
    mockFailure();
    render(<DueCardsSummary />);

    expect(await screen.findByText('Pick up where you left off')).toBeInTheDocument();
    expect(screen.queryByText(/8 cards/)).not.toBeInTheDocument();
  });

  it('leaves the accuracy card standing without a number', async () => {
    mockFailure();
    render(<AccuracySummary />);

    expect(await screen.findByText('Track your learning stats')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d/);
  });

  it('removes the streak pill entirely, since a streak pill is only a number', async () => {
    mockFailure();
    const { container } = render(<StreakBadge />);

    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('says a tile is unavailable instead of showing zero', async () => {
    mockFailure();
    render(<HomeStatTile metric="streak" icon={null} iconWrapperClassName="icon" />);

    expect(await screen.findByText(/Unavailable/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d/);
  });

  it('treats a non-ok response as a failure rather than reading zero off it', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({ ok: false, json: async () => ({}) }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<DueCardsSummary />);
    expect(await screen.findByText('Pick up where you left off')).toBeInTheDocument();
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
