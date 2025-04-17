// __tests__/auth/SignUpForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignUpForm from '@/components/auth/SignUpForm';
import { useRouter } from 'next/navigation';

// Mock the next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('SignUpForm', () => {
  beforeEach(() => {
    // Setup router mock
    const mockRouter = {
      push: jest.fn(),
    };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  test('renders the sign-up form', () => {
    render(<SignUpForm />);
    
    expect(screen.getByText('Create an Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  test('validates form inputs', async () => {
    render(<SignUpForm />);
    
    // Submit the form without filling it
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      expect(screen.getAllByText(/password must be at least 8 characters/i).length).toBe(2);
    });
  });

  test('submits the form with valid data', async () => {
    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'User created successfully', userId: '123' }),
    });
    
    const { push } = useRouter() as any;
    
    render(<SignUpForm />);
    
    // Fill the form
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password123' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        }),
      });
      
      // Check if router.push was called with the correct URL
      expect(push).toHaveBeenCalledWith('/signin?registered=true');
    });
  });
});