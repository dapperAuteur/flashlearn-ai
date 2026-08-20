import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import ClaimAccountForm from '@/components/auth/ClaimAccountForm';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

global.fetch = jest.fn();

/** The age gate renders first, so every field test has to answer it. */
function renderPastAgeGate() {
  const result = render(<ClaimAccountForm />);
  fireEvent.click(screen.getByRole('button', { name: /yes, i'm 13 or older/i }));
  return result;
}

function fillForm() {
  fireEvent.change(screen.getByLabelText(/claim code/i), { target: { value: 'ABCDE-FGHJK' } });
  fireEvent.change(screen.getByLabelText(/your email address/i), {
    target: { value: 'student@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/choose a password/i), {
    target: { value: 'Str0ng!Passw0rd' },
  });
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: 'Str0ng!Passw0rd' },
  });
  fireEvent.click(screen.getByRole('button', { name: /claim my account/i }));
}

describe('ClaimAccountForm', () => {
  beforeEach(() => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (global.fetch as jest.Mock).mockReset();
    window.localStorage.clear();
  });

  test('asks for age attestation before showing any field', () => {
    render(<ClaimAccountForm />);

    expect(screen.getByText('Quick check first')).toBeInTheDocument();
    expect(screen.queryByLabelText(/claim code/i)).not.toBeInTheDocument();
  });

  test('prefills the code from a link', () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams('code=ABCDE-FGHJK'));

    renderPastAgeGate();

    expect(screen.getByLabelText(/claim code/i)).toHaveValue('ABCDE-FGHJK');
  });

  test('tells the student to ask for a new code when this one expired', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 410,
      json: async () => ({ error: 'That claim code has expired.' }),
    });

    renderPastAgeGate();
    fillForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /ask your teacher for a new code/i,
    );
  });

  test('keeps an unknown or spent code distinct from an expired one', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'That claim code is not valid or has already been used.' }),
    });

    renderPastAgeGate();
    fillForm();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/not valid or has already been used/i);
    expect(alert).not.toHaveTextContent(/expired/i);
  });

  test('sends the student to verify their email before signing in', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        user: { id: 'u1', name: 'Ada', email: 'student@example.com' },
        requiresEmailVerification: true,
        emailVerificationSent: true,
        preserved: { studySessions: 4 },
      }),
    });

    renderPastAgeGate();
    fillForm();

    await waitFor(() =>
      expect(screen.getByText('The account is yours')).toBeInTheDocument(),
    );
    expect(screen.getByText(/check student@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to sign in/i })).toHaveAttribute(
      'href',
      '/auth/signin',
    );
  });
});
