/**
 * When the local read cache fails to open, every offline query returns nothing
 * and the app tells a user with plenty of sets that they have none. These
 * assertions are the contract that the failure is said out loud instead: only
 * when it happened, only to someone who has sets to lose, in words that name a
 * cause the reader can act on.
 */
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import LocalStoreErrorBanner from '@/components/ui/LocalStoreErrorBanner';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;

function signedIn() {
  mockUseSession.mockReturnValue({ data: { user: { id: 'u1' } }, status: 'authenticated' });
}

beforeEach(() => {
  jest.clearAllMocks();
  signedIn();
});

describe('when the local store failed to open', () => {
  it('announces the failure as an alert', () => {
    render(<LocalStoreErrorBanner failed />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Offline study is not available on this device');
  });

  it('says the sets are safe on the server so nobody thinks their work is gone', () => {
    render(<LocalStoreErrorBanner failed />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      /Your sets are safe on the server/i,
    );
  });

  it('names the causes a reader can act on', () => {
    render(<LocalStoreErrorBanner failed />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/Reloading the page/i);
    expect(alert).toHaveTextContent(/Private and incognito windows/i);
  });

  it('carries the state in text rather than only in colour', () => {
    // The heading alone has to be enough for a screen reader, a high-contrast
    // mode, and anyone who does not see the amber.
    render(<LocalStoreErrorBanner failed />);

    expect(
      screen.getByText('Offline study is not available on this device'),
    ).toBeInTheDocument();
  });

  it('offers no dismiss control, because dismissing would hide a live problem', () => {
    render(<LocalStoreErrorBanner failed />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('stays quiet for a signed-out visitor with no offline copy to lose', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    render(<LocalStoreErrorBanner failed />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('when the local store opened normally', () => {
  it('renders nothing at all', () => {
    const { container } = render(<LocalStoreErrorBanner failed={false} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});
