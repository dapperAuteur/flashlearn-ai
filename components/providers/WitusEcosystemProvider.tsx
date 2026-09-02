'use client';

import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { signOut } from 'next-auth/react';
import { endSessionUrlWithReturn } from '@/lib/auth/witusEcosystem';

/**
 * Carries the SERVER-RESOLVED WitUS end-session URL to the sign-out buttons.
 *
 * WHY A CONTEXT. Sign-out is offered from four places (the user menu, the admin
 * sidebar, settings' delete-account flow, and the unused public layout), all of
 * them Client Components several levels below a Server Component and none of
 * them taking server props today. `WITUS_OIDC_CLIENT_ID` has no NEXT_PUBLIC_
 * prefix, so a Client Component reading it directly gets `undefined` and the
 * feature dies silently. Reading it once in app/layout.tsx and pushing it down —
 * the same pattern layout.tsx already uses for the PostHog key — keeps the env
 * read on the server and gives every button the same answer.
 *
 * `null` means "not a configured ecosystem OIDC client", and every consumer then
 * falls back to today's purely-local sign-out.
 */
const WitusEndSessionContext = createContext<string | null>(null);

export function WitusEcosystemProvider({
  endSessionUrl,
  children,
}: {
  endSessionUrl: string | null;
  children: ReactNode;
}) {
  return (
    <WitusEndSessionContext.Provider value={endSessionUrl}>
      {children}
    </WitusEndSessionContext.Provider>
  );
}

/**
 * Sign-out, global when this app is an ecosystem OIDC client and local when it
 * is not.
 *
 * Returns `{ signOutEverywhere, isGlobal, label }`. `label` is here rather than
 * hardcoded at each call site so the copy stays consistent: "Sign out of WitUS"
 * tells the person that the click reaches beyond this tab, which is the whole
 * point of BAM's 2026-08-30 decision that signing out signs you out of every
 * WitUS app.
 */
export function useWitusSignOut() {
  const endSessionUrl = useContext(WitusEndSessionContext);

  const signOutEverywhere = useCallback(
    async (options?: { callbackUrl?: string }) => {
      const callbackUrl = options?.callbackUrl ?? '/';

      if (!endSessionUrl) {
        // No shared session to end. Exactly what every call site did before.
        await signOut({ callbackUrl });
        return;
      }

      // ORDER IS THE SAFETY PROPERTY. Destroy the LOCAL session first, and only
      // then hand the browser to the IdP. `redirect: false` is what makes this
      // possible: it awaits the real sign-out round trip instead of navigating
      // away mid-flight, so by the time the next line runs the local session is
      // definitely gone. If the IdP is then unreachable, refuses the logout, or
      // never returns, the person is still signed out HERE. Handing off first
      // and clearing locally afterwards would turn any IdP failure into "I
      // clicked sign out and I'm still signed in", which is the bug this
      // ordering exists to prevent.
      await signOut({ redirect: false });

      // A full navigation, not a router push: this leaves our origin. The IdP
      // ends the shared session and returns to post_logout_redirect_uri, which
      // must be registered for this client in gemini/witus
      // lib/identity/clients.ts — https://flashlearnai.witus.online/ — or the
      // IdP lands the visitor on its own page instead. Signed out either way.
      window.location.assign(endSessionUrlWithReturn(endSessionUrl, window.location.origin));
    },
    [endSessionUrl]
  );

  return {
    signOutEverywhere,
    isGlobal: Boolean(endSessionUrl),
    label: endSessionUrl ? 'Sign out of WitUS' : 'Sign out',
  };
}
