import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignUpForm from '@/components/auth/SignUpForm';
import { useRouter, useSearchParams } from 'next/navigation';

// SignUpForm reads useRouter and useSearchParams, so both have to exist on the mock.
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

const mockPush = jest.fn();

/**
 * The form is behind an age gate that renders first, so every test that wants the signup
 * fields has to answer "yes" before the fields exist.
 */
function renderSignedUpForm() {
  const result = render(<SignUpForm />);
  fireEvent.click(screen.getByRole('button', { name: /yes, i'm 13 or older/i }));
  return result;
}

describe('SignUpForm', () => {
  beforeEach(() => {
    mockPush.mockReset();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    (global.fetch as jest.Mock).mockReset();

    // The gate stores a 24h "under 13" answer, which would otherwise leak between tests.
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  test('asks for age attestation before showing any signup fields', () => {
    render(<SignUpForm />);

    expect(screen.getByText('Quick check first')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Full Name/i)).not.toBeInTheDocument();
  });

  test('closes signup when the visitor says they are under 13', () => {
    render(<SignUpForm />);

    fireEvent.click(screen.getByRole('button', { name: /no, i'm under 13/i }));

    expect(screen.getByText('Thanks for checking')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Full Name/i)).not.toBeInTheDocument();
  });

  test('renders the sign-up form', () => {
    renderSignedUpForm();

    expect(screen.getByText('Create an Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm Password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('validates form inputs', async () => {
    renderSignedUpForm();

    // Submit the form without filling it
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      expect(screen.getByText(/password must be at least 10 characters/i)).toBeInTheDocument();
    });
  });

  test('flags a password mismatch', async () => {
    renderSignedUpForm();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'AStr0ng!Password' } });
    fireEvent.change(screen.getByLabelText(/^Confirm Password$/i), { target: { value: 'Different1!Password' } });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('submits the form with valid data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'User created successfully', userId: '123' }),
    });

    renderSignedUpForm();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'AStr0ng!Password' } });
    fireEvent.change(screen.getByLabelText(/^Confirm Password$/i), { target: { value: 'AStr0ng!Password' } });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/register', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      name: 'Test User',
      email: 'test@example.com',
      password: 'AStr0ng!Password',
      ageAttested: true,
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/signin?status=signup-success');
    });
  });

  test('surfaces the server error when registration fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email already registered' }),
    });

    renderSignedUpForm();

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'AStr0ng!Password' } });
    fireEvent.change(screen.getByLabelText(/^Confirm Password$/i), { target: { value: 'AStr0ng!Password' } });

    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
