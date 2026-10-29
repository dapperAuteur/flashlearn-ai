/**
 * Sign-out semantics (BAM, 2026-10-29, witus task 128 option (b)):
 *  - "Sign out" ends only FlashLearnAI's session and never visits the IdP, even
 *    when an end-session URL is configured. Its name is exactly "Sign out".
 *  - "Sign out of WitUS everywhere" is a separate control that renders only
 *    when the server resolved an end-session URL, ends the local session
 *    BEFORE navigating, and carries visible help text via aria-describedby.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { signOut } from 'next-auth/react';
import { WitusEcosystemProvider } from '@/components/providers/WitusEcosystemProvider';
import UserMenu from '@/components/ui/UserMenu';

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
}));

const mockSignOut = signOut as jest.Mock;

const ORIGIN = 'https://flashlearnai.witus.online';
const END_SESSION =
  'https://accounts.witus.online/api/idp/oauth2/endsession?client_id=witus-flashlearnai';
const HELP =
  'Also signs you out of WitUS. Other WitUS apps you are signed in to stay signed in until you sign out of them.';

const user = { name: 'Ada', email: 'ada@example.com', role: 'Student' };

let calls: string[];
const originalLocation = window.location;

beforeEach(() => {
  calls = [];
  mockSignOut.mockReset();
  mockSignOut.mockImplementation(async (opts: unknown) => {
    calls.push(`signOut:${JSON.stringify(opts)}`);
  });
  // jsdom's location cannot be spied on directly; swap in a stub.
  // @ts-expect-error -- replacing a read-only global for the test
  delete window.location;
  // @ts-expect-error -- minimal stub
  window.location = {
    origin: ORIGIN,
    assign: jest.fn((url: string) => calls.push(`assign:${url}`)),
  };
});

afterEach(() => {
  // @ts-expect-error -- restore the real global
  window.location = originalLocation;
});

function renderMenu(endSessionUrl: string | null) {
  render(
    <WitusEcosystemProvider endSessionUrl={endSessionUrl}>
      <UserMenu user={user} />
    </WitusEcosystemProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: /open user menu/i }));
}

describe('"Sign out" is this app only', () => {
  it('is named exactly "Sign out" and has no everywhere control when unconfigured', () => {
    renderMenu(null);
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', { name: 'Sign out of WitUS everywhere' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(HELP)).not.toBeInTheDocument();
  });

  it('never navigates to the endsession URL, even when one is configured', async () => {
    renderMenu(END_SESSION);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
    expect(calls.join(' ')).not.toContain('endsession');
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});

describe('"Sign out of WitUS everywhere"', () => {
  it('renders when configured, with its help text linked by aria-describedby', () => {
    renderMenu(END_SESSION);
    const control = screen.getByRole('menuitem', { name: 'Sign out of WitUS everywhere' });
    const describedBy = control.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const help = document.getElementById(describedBy as string);
    expect(help).toHaveTextContent(HELP);
    expect(help).toBeVisible();
    // Next to Sign out, not instead of it.
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('ends the local session BEFORE navigating to the IdP endsession URL', async () => {
    renderMenu(END_SESSION);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out of WitUS everywhere' }));
    await waitFor(() => expect(window.location.assign).toHaveBeenCalled());
    expect(calls).toEqual([
      'signOut:{"redirect":false}',
      `assign:${END_SESSION}&post_logout_redirect_uri=${encodeURIComponent(`${ORIGIN}/`)}`,
    ]);
    expect(calls[1]).toBe(
      'assign:https://accounts.witus.online/api/idp/oauth2/endsession?client_id=witus-flashlearnai' +
        '&post_logout_redirect_uri=https%3A%2F%2Fflashlearnai.witus.online%2F'
    );
  });

  it('still hands off to the IdP when ending the local session throws', async () => {
    mockSignOut.mockImplementation(async () => {
      calls.push('signOut:failed');
      throw new Error('network');
    });
    renderMenu(END_SESSION);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out of WitUS everywhere' }));
    await waitFor(() => expect(window.location.assign).toHaveBeenCalled());
    expect(calls[0]).toBe('signOut:failed');
    expect(calls[1]).toContain('/oauth2/endsession?client_id=witus-flashlearnai&post_logout_redirect_uri=');
  });
});
