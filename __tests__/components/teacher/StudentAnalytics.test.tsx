import { render, screen, within } from '@testing-library/react';
import StudentAnalytics from '@/components/teacher/StudentAnalytics';

// The panel only fetches and renders. Logging posts on its own and is not what
// these tests are about.
jest.mock('../../../lib/logging/client-logger', () => ({
  Logger: { log: jest.fn(), warning: jest.fn(), error: jest.fn() },
  LogContext: { SYSTEM: 'system' },
}));

const emptyReport = {
  student: { id: 'student-1', name: 'Ada Okafor', isManaged: true, isSelf: false },
  hasStudied: false,
  totals: {
    sessions: 0,
    cardsAnswered: 0,
    correct: 0,
    incorrect: 0,
    accuracy: null,
    timeStudiedSeconds: 0,
    averageSessionScore: null,
  },
  recent: {
    windowDays: 30,
    sessions: 0,
    cardsAnswered: 0,
    correct: 0,
    incorrect: 0,
    accuracy: null,
    timeStudiedSeconds: 0,
  },
  sessions: [],
  sets: [],
  problemCards: [],
};

const fullReport = {
  student: { id: 'student-1', name: 'Ada Okafor', isManaged: false, isSelf: false },
  hasStudied: true,
  totals: {
    sessions: 4,
    cardsAnswered: 40,
    correct: 30,
    incorrect: 10,
    accuracy: 75,
    timeStudiedSeconds: 3900,
    averageSessionScore: 72,
  },
  recent: {
    windowDays: 30,
    sessions: 2,
    cardsAnswered: 20,
    correct: 17,
    incorrect: 3,
    accuracy: 85,
    timeStudiedSeconds: 1800,
  },
  sessions: [
    {
      id: 'session-1',
      setId: 'set-1',
      setName: 'Cell biology',
      startedAt: '2026-08-20T15:04:00.000Z',
      correct: 9,
      incorrect: 1,
      accuracy: 90,
      durationSeconds: 720,
      studyMode: 'classic',
      proctored: true,
    },
  ],
  sets: [
    {
      setId: 'set-1',
      setName: 'Cell biology',
      sessions: 4,
      timeStudiedSeconds: 3900,
      correct: 30,
      incorrect: 10,
      accuracy: 75,
      averageScore: 72,
      cardsTracked: 12,
    },
  ],
  problemCards: [
    {
      cardId: 'card-1',
      setId: 'set-1',
      setName: 'Cell biology',
      front: 'What is mitosis?',
      correct: 1,
      incorrect: 4,
      accuracy: 20,
      weakestMode: { mode: 'type-answer', direction: 'back-to-front', accuracy: 10 },
    },
  ],
};

function mockReport(report: unknown, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok, json: async () => report });
}

describe('StudentAnalytics', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('says a student has not studied instead of showing zero percent', async () => {
    mockReport(emptyReport);

    render(<StudentAnalytics studentId="student-1" />);

    expect(await screen.findByText('No study sessions yet')).toBeInTheDocument();
    expect(screen.getByText(/there is nothing to score/i)).toBeInTheDocument();
    // The whole point of the empty state: no figure is presented as performance.
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('never shows a managed account synthetic address', async () => {
    mockReport(emptyReport);

    render(<StudentAnalytics studentId="student-1" />);

    expect(await screen.findByText(/class account you created/i)).toBeInTheDocument();
    expect(screen.queryByText(/\.invalid/)).not.toBeInTheDocument();
  });

  test('gives every number as text in a captioned table', async () => {
    mockReport(fullReport);

    render(<StudentAnalytics studentId="student-1" />);

    expect(await screen.findByText('Ada Okafor: progress')).toBeInTheDocument();

    const summary = screen.getByRole('region', { name: 'The short version' });
    expect(within(summary).getByText('75%')).toBeInTheDocument();
    expect(within(summary).getByText('85%')).toBeInTheDocument();
    expect(within(summary).getByText('1h 5m')).toBeInTheDocument();
    expect(within(summary).getByText('30')).toBeInTheDocument();
    expect(within(summary).getByText('10')).toBeInTheDocument();

    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(3);
    tables.forEach((table) => {
      // A caption is what tells a screen-reader user which table they landed in.
      expect(table.querySelector('caption')).not.toBeNull();
      expect(table.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(0);
      expect(table.querySelectorAll('th[scope="row"]').length).toBeGreaterThan(0);
    });

    const cardsTable = tables[0];
    expect(within(cardsTable).getByText('What is mitosis?')).toBeInTheDocument();
    expect(within(cardsTable).getByText(/Type the answer, back to front \(10%\)/)).toBeInTheDocument();

    // A session an adult ran is labelled as one, on the student's own page.
    expect(screen.getByText('With an adult')).toBeInTheDocument();
  });

  test('reports a refusal from the API rather than an empty page', async () => {
    mockReport({ error: 'You can only see progress for a student you teach or are linked to.' }, false);

    render(<StudentAnalytics studentId="student-1" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You can only see progress for a student you teach or are linked to.',
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
