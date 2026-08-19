import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
// The dashboard layout lives at the App Router segment, not under components/layout/.
import DashboardLayout from '@/app/(dashboard)/layout';

// Mock the next-auth/react module
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// The layout composes a header, an onboarding modal, and the offline sync service. None of them
// are what these tests are about, and all three pull in browser-only dependencies, so stub them.
jest.mock('../../../components/layout/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="header" />,
}));

jest.mock('../../../components/ui/OnboardingModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../hooks/OnboardingHooks', () => ({
  useOnboarding: () => ({
    showOnboarding: false,
    currentStep: 0,
    nextStep: jest.fn(),
    previousStep: jest.fn(),
    completeOnboarding: jest.fn(),
    skipOnboarding: jest.fn(),
  }),
}));

const mockInitialize = jest.fn();
jest.mock('../../../lib/services/syncService', () => ({
  getSyncService: () => ({ initialize: mockInitialize }),
}));

describe('DashboardLayout', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    mockRouter.push.mockReset();
    mockInitialize.mockReset();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('shows loading state when session is loading', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading',
    });

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('redirects to sign in page when user is not authenticated', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(mockRouter.push).toHaveBeenCalledWith('/auth/signin');
    expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
      },
      status: 'authenticated',
    });

    render(
      <DashboardLayout>
        <div>Test Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
