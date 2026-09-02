/**
 * Server-side resolution of the two ecosystem-SSO URLs.
 *
 * SEPARATE FILE ON PURPOSE. `lib/auth/witusEcosystem.ts` is imported by Client
 * Components; this one reads `WITUS_OIDC_CLIENT_ID`, which is a server-only
 * secret-adjacent value with no `NEXT_PUBLIC_` prefix. Importing it from a
 * Client Component would inline `undefined` into the browser bundle and silently
 * turn both features off, so the rule is: Server Components call these, and pass
 * the resolved string (or null) down as a prop.
 *
 * FUNCTIONS, NOT MODULE-SCOPE CONSTANTS, so the value is read at request time on
 * Vercel rather than frozen at build time.
 *
 * BOTH RETURN null UNLESS `WITUS_OIDC_CLIENT_ID` IS SET. That is the whole gate.
 * Without a registered client this app cannot complete an OIDC round trip, so
 * offering "Continue as ..." would be an affordance that dead-ends, and pointing
 * sign-out at the IdP would hand the visitor to a logout it will refuse. Note
 * this is deliberately the SERVER flag, not `NEXT_PUBLIC_WITUS_SSO`: the public
 * flag controls whether the sign-in BUTTON renders (see SignInForm), while the
 * ability to end the shared session depends only on being a real OIDC client.
 */
import {
  WITUS_OIDC_DISCOVERY_FALLBACK,
  endSessionEndpointFromDiscovery,
  silentSsoEndpointFromDiscovery,
} from '@/lib/auth/witusEcosystem';

function discoveryUrl(): string {
  return process.env.WITUS_OIDC_DISCOVERY_URL ?? WITUS_OIDC_DISCOVERY_FALLBACK;
}

/**
 * Where sign-out ends the SHARED WitUS session, with `client_id` already baked
 * in. The caller appends `post_logout_redirect_uri` (see
 * `endSessionUrlWithReturn`), which is why this ends in a query string.
 *
 * `client_id` IS REQUIRED, not optional. better-auth's endSession endpoint
 * rejects a `post_logout_redirect_uri` with `invalid_request` unless the request
 * carries either a verifiable `id_token_hint` or an explicit `client_id`, and
 * this app has no id_token available client-side. It is appended HERE, on the
 * server, because the sign-out buttons are Client Components and must never be
 * handed the raw env.
 */
export function witusEndSessionUrl(): string | null {
  const clientId = process.env.WITUS_OIDC_CLIENT_ID;
  if (!clientId) return null;
  const base = endSessionEndpointFromDiscovery(discoveryUrl());
  if (!base) return null;
  return `${base}?client_id=${encodeURIComponent(clientId)}`;
}

/**
 * Where the sign-in page's silent "Continue as ..." check asks the IdP who this
 * browser is. Derived from the discovery URL this app is already configured
 * with, so nothing new about accounts.witus.online is asserted here.
 */
export function witusSilentSsoUrl(): string | null {
  if (!process.env.WITUS_OIDC_CLIENT_ID) return null;
  return silentSsoEndpointFromDiscovery(discoveryUrl());
}
