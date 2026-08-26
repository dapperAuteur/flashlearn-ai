/**
 * A finished study session must not survive into the next one.
 *
 * StudySessionProvider is mounted in ClientRoot, above the router, so
 * `sessionId` and `isComplete` outlive every client-side navigation, and
 * `resetSession` is otherwise only called by the two buttons on the results
 * screen. Anyone arriving at /study another way used to land back on the last
 * session's results.
 *
 * The case that made it matter: a teacher finishes a session, walks to a
 * classroom roster, and clicks Start session on a student. Because
 * StudySessionSetup never mounts in that state, ProctorSubjectFromLink never
 * runs, so the student is not merely un-shown, they are never selected.
 */
import { render, screen } from '@testing-library/react';
import StudySessionManager from '@/components/study/StudySessionManager';

const resetSession = jest.fn();
let contextValue: Record<string, unknown>;

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('../../../contexts/StudySessionContext', () => ({
  useStudySession: () => contextValue,
}));
jest.mock('../../../lib/logging/client-logger', () => ({
  Logger: { log: jest.fn(), warning: jest.fn(), error: jest.fn() },
  LogContext: { STUDY: 'study' },
}));

// The children are not what these tests are about, and the results panel
// fetches on mount.
jest.mock('../../../components/study/StudySessionSetup', () => ({
  __esModule: true,
  default: () => <div>set picker</div>,
}));
jest.mock('../../../components/study/StudySessionResults', () => ({
  __esModule: true,
  default: () => <div>results</div>,
}));

const completedSession = () => ({
  sessionId: 'session-1',
  isComplete: true,
  flashcardSetName: 'Sevens',
  isLoading: false,
  error: null,
  flashcards: [],
  currentIndex: 0,
  studyDirection: 'front-to-back',
  studyMode: 'flashcard',
  multipleChoiceData: null,
  sessionStartTime: null,
  recordCardResult: jest.fn(),
  recordConfidence: jest.fn(),
  resetSession,
  lastCardResult: null,
  isConfidenceRequired: false,
  hasCompletedConfidence: true,
  proctorSubject: null,
});

beforeEach(() => {
  resetSession.mockClear();
  contextValue = completedSession();
});

describe('arriving at /study with a session already finished', () => {
  it('clears it when a teacher arrives from a student row', () => {
    render(<StudySessionManager proctorStudentId="student-1" />);
    expect(resetSession).toHaveBeenCalledTimes(1);
  });

  it('clears it when arriving with no parameters at all', () => {
    // The gap in the previous version: the reset was gated on a setId being
    // present, so a bare /study, and /study?studentId=... with it, slipped past.
    render(<StudySessionManager />);
    expect(resetSession).toHaveBeenCalledTimes(1);
  });

  it('clears it when arriving with a set chosen', () => {
    render(<StudySessionManager preSelectedSetId="set-9" />);
    expect(resetSession).toHaveBeenCalledTimes(1);
  });

  it('clears it again when the URL switches to a different student', () => {
    // The App Router keeps this component mounted across a search-param change
    // on the same route, so a mount-only reset would miss this.
    const { rerender } = render(<StudySessionManager proctorStudentId="student-1" />);
    expect(resetSession).toHaveBeenCalledTimes(1);

    contextValue = completedSession();
    rerender(<StudySessionManager proctorStudentId="student-2" />);
    expect(resetSession).toHaveBeenCalledTimes(2);
  });
});

describe('what must not be cleared', () => {
  it('leaves the results on screen when a session finishes under you', () => {
    // The component is already mounted when isComplete flips, so resetting on
    // that transition would wipe the results the learner just earned.
    contextValue = { ...completedSession(), isComplete: false };
    const { rerender } = render(<StudySessionManager preSelectedSetId="set-9" />);
    expect(resetSession).not.toHaveBeenCalled();

    contextValue = completedSession();
    rerender(<StudySessionManager preSelectedSetId="set-9" />);

    expect(resetSession).not.toHaveBeenCalled();
    expect(screen.getByText('results')).toBeInTheDocument();
  });

  it('does nothing when there is no finished session to clear', () => {
    contextValue = { ...completedSession(), sessionId: null, isComplete: false };
    render(<StudySessionManager proctorStudentId="student-1" />);
    expect(resetSession).not.toHaveBeenCalled();
  });
});
