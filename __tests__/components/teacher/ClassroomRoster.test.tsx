import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClassroomRoster from '@/components/teacher/ClassroomRoster';

// The roster only talks to the network and renders. Logging is not what these
// tests are about and it posts on its own, so it is stubbed.
jest.mock('../../../lib/logging/client-logger', () => ({
  Logger: { log: jest.fn(), warning: jest.fn(), error: jest.fn() },
  LogContext: { SYSTEM: 'system' },
}));

const managedStudent = {
  id: 'student-1',
  name: 'Ada Lovelace',
  email: null,
  username: null,
  isManaged: true,
  managedByYou: true,
  hasClaimCode: true,
  claimCodeExpiresAt: '2026-11-17T00:00:00.000Z',
  claimCodeExpired: false,
  pendingDeletion: false,
};

const selfSignupStudent = {
  ...managedStudent,
  id: 'student-2',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  isManaged: false,
  managedByYou: false,
  hasClaimCode: false,
  claimCodeExpiresAt: null,
};

function mockRoster(students: unknown[]) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ classroom: { id: 'c1', name: 'Bio', isArchived: false }, students }),
  });
}

describe('ClassroomRoster', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('marks a managed student and shows no email address for them', async () => {
    mockRoster([managedStudent, selfSignupStudent]);

    render(<ClassroomRoster classroomId="c1" joinCode="ABC123" />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Class account, not claimed yet')).toBeInTheDocument();
    expect(screen.getByText('grace@example.com')).toBeInTheDocument();
    // The managed account's address is synthetic and must never reach the page.
    expect(screen.queryByText(/\.invalid/)).not.toBeInTheDocument();
  });

  test('links a start-session button to study with that student preselected', async () => {
    mockRoster([managedStudent]);

    render(<ClassroomRoster classroomId="c1" joinCode="ABC123" />);

    const link = await screen.findByRole('link', { name: /start session with Ada Lovelace/i });
    expect(link).toHaveAttribute('href', '/study?studentId=student-1');
  });

  test('shows the claim code once, in a dialog that needs a deliberate dismiss', async () => {
    mockRoster([]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        student: { ...managedStudent, name: 'New Student' },
        claimCode: 'ABCDE-FGHJK',
        claimCodeExpiresAt: '2026-11-17T00:00:00.000Z',
      }),
    });

    render(<ClassroomRoster classroomId="c1" joinCode="ABC123" />);

    fireEvent.change(await screen.findByLabelText(/add a student/i), {
      target: { value: 'New Student' },
    });
    fireEvent.click(screen.getByRole('button', { name: /add student/i }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId('claim-code-value')).toHaveTextContent('ABCDE-FGHJK');
    expect(screen.getByText(/shown once and cannot be looked up again/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /i have written the code down/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  test('asks for confirmation before removing, and says the account survives', async () => {
    mockRoster([managedStudent]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, removed: managedStudent, accountDeleted: false }),
    });

    render(<ClassroomRoster classroomId="c1" joinCode="ABC123" />);

    fireEvent.click(await screen.findByRole('button', { name: /remove Ada Lovelace/i }));
    expect(screen.getByText(/The account and everything/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /confirm remove/i }));

    expect(await screen.findByText(/The account still exists/i)).toBeInTheDocument();
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
  });
});
