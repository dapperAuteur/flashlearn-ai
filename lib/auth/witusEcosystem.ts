/**
 * Ecosystem SSO helpers — "Continue as <name>" and global sign-out.
 *
 * PURE ON PURPOSE. Nothing here reads `process.env`, touches `window` at module
 * scope, or imports anything server-only, because both a Server Component
 * (app/layout.tsx, the sign-in page) and a Client Component (SignInForm, the
 * sign-out menus) import from this file. The env reads live in
 * `lib/auth/witusEcosystemServer.ts`, which only the server side imports.
 *
 * TWO FEATURES, ONE GATE.
 *
 * 1. "Continue as <name>". The sign-in form renders immediately, exactly as it
 *    does today, and IN PARALLEL asks the IdP over CORS whether this browser
 *    already has a WitUS session. If an answer comes back, the existing "Sign in
 *    with WitUS" button relabels to "Continue as <name>". If it does not — a
 *    timeout, a CORS refusal, a browser that partitions third-party cookies —
 *    nothing changes and nothing is said. A failed silent check is invisible;
 *    that is a requirement, not a fallback.
 *
 * 2. Global sign-out (BAM's decision, 2026-08-30: "signout signs out of every
 *    app"). After the LOCAL NextAuth session is destroyed, the browser is handed
 *    to the IdP's RP-initiated logout endpoint so the shared session ends too.
 *
 * THE NAME THE PROBE RETURNS IS DISPLAY COPY, NEVER A CREDENTIAL. It arrives in
 * a cross-origin response body, so it is client-supplied by definition. It must
 * never gate access, populate a session, or be sent anywhere. Clicking the
 * button runs the real OIDC code flow through `signIn("witus")`, and that flow
 * is the only thing in this app that establishes who someone is.
 */

/** Query param marking "this browser already tried the ecosystem flow here". */
export const SSO_ATTEMPT_PARAM = 'sso';
export const SSO_ATTEMPT_VALUE = 'tried';

/**
 * sessionStorage key for the same one-shot marker. Written IMMEDIATELY BEFORE
 * the redirect to the IdP, never after coming back: a marker written on return
 * is a marker that does not exist when the return is the thing that failed.
 */
export const SSO_ATTEMPT_STORAGE_KEY = 'witus.sso.attempted';

/** How long to wait for the probe. A silent check that hangs is a broken page. */
export const SILENT_SSO_TIMEOUT_MS = 4000;

/**
 * The discovery document this app points at when nothing is configured. Same
 * value the NextAuth provider in lib/auth/auth.ts uses — it is imported from
 * here so the one external URL this app asserts is written down once.
 */
export const WITUS_OIDC_DISCOVERY_FALLBACK =
  'https://accounts.witus.online/api/idp/.well-known/openid-configuration';

/** Longest display name rendered. Caps an absurd or hostile value. */
const MAX_LABEL_LENGTH = 48;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** Identity shown on the button. Display only, never a credential. */
export interface SsoIdentity {
  /** What "Continue as ___" says. Already de-controlled, trimmed, length-capped. */
  label: string;
}

export type SilentSsoSkip =
  | 'not-configured'
  | 'already-attempted'
  | 'already-signed-in';

export type SilentSsoDecision =
  | { attempt: true }
  | { attempt: false; skip: SilentSsoSkip };

/**
 * Should this browser ask the IdP who it is?
 *
 * `endpoint` is the SERVER-RESOLVED probe URL. It is null whenever
 * `WITUS_OIDC_CLIENT_ID` is unset, which is the gate: an app that is not a
 * registered ecosystem client cannot complete the flow, and an affordance the
 * visitor cannot complete is worse than no affordance at all.
 *
 * FlashLearnAI serves one host (flashlearnai.witus.online) and has no
 * tenant-branded surfaces, so there is no per-host gate here the way there is
 * in the multi-tenant apps. If this app ever grows customer-branded hosts, add
 * that gate ON THE SERVER from the request host before this is called — a
 * white-label surface must never make even one request to accounts.witus.online.
 */
export function silentSsoDecision(input: {
  endpoint: string | null | undefined;
  search?: string | null;
  attempted?: boolean;
  signedIn?: boolean;
}): SilentSsoDecision {
  if (!input.endpoint) return { attempt: false, skip: 'not-configured' };
  if (input.signedIn) return { attempt: false, skip: 'already-signed-in' };
  if (input.attempted || hasAttemptMarker(input.search) || hasSignInError(input.search)) {
    return { attempt: false, skip: 'already-attempted' };
  }
  return { attempt: true };
}

/** Does this query string carry the one-shot marker? Accepts "?a=b" or "a=b". */
export function hasAttemptMarker(search: string | null | undefined): boolean {
  return readParam(search, SSO_ATTEMPT_PARAM) === SSO_ATTEMPT_VALUE;
}

/**
 * The second half of the loop guard, in the shape NextAuth actually produces.
 *
 * The loop this prevents: a stale IdP session makes the probe answer "Continue
 * as X"; the visitor clicks; the IdP cannot finish; NextAuth bounces back to
 * `pages.signIn` (/auth/signin) with `?error=`; the probe runs again and offers
 * the same dead button, forever.
 *
 * sessionStorage is the primary guard, but it throws outright in some privacy
 * modes and does not survive a return into a different tab. NextAuth has no
 * `errorCallbackURL` to hang `?sso=tried` on, so its own `?error=` is what is
 * reliably on the URL after a failed OAuth round trip — treat it as the marker.
 * A password failure never lands here: SignInForm submits credentials with
 * `redirect: false` and renders the error in component state.
 */
export function hasSignInError(search: string | null | undefined): boolean {
  return Boolean(readParam(search, 'error'));
}

function readParam(search: string | null | undefined, key: string): string | null {
  if (typeof search !== 'string' || search === '') return null;
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(key);
}

/**
 * Split a discovery URL into the IdP's origin and its better-auth basePath.
 *
 *   https://accounts.witus.online/api/idp/.well-known/openid-configuration
 *     -> { origin: "https://accounts.witus.online", basePath: "/api/idp" }
 *
 * Everything below derives from this instead of hardcoding accounts.witus.online
 * a second time, so the one external value this app asserts stays the discovery
 * URL the NextAuth provider is already configured with.
 */
function splitDiscoveryUrl(
  discoveryUrl: string | null | undefined
): { origin: string; basePath: string } | null {
  if (!discoveryUrl) return null;
  let parsed: URL;
  try {
    parsed = new URL(discoveryUrl);
  } catch {
    return null;
  }
  const cut = parsed.pathname.indexOf('/.well-known/');
  if (cut < 0) return null;
  return { origin: parsed.origin, basePath: parsed.pathname.slice(0, cut) };
}

/**
 * The IdP's RP-initiated logout endpoint: `<basePath>/oauth2/endsession`, which
 * is the `end_session_endpoint` the live discovery document advertises.
 *
 * Ending only this app's session would leave the shared session alive, which
 * means signing out and coming back would offer to sign you straight back in
 * via "Continue as <name>" — which reads as a broken logout.
 */
export function endSessionEndpointFromDiscovery(
  discoveryUrl: string | null | undefined
): string | null {
  const parts = splitDiscoveryUrl(discoveryUrl);
  if (!parts) return null;
  return `${parts.origin}${parts.basePath}/oauth2/endsession`;
}

/**
 * The ecosystem session probe: `<idp-origin>/api/ecosystem/session`.
 *
 * NOT better-auth's `<basePath>/get-session`, for two reasons. better-auth's
 * core emits no CORS headers, so no browser would ever read the response; and
 * it must not simply be given them, because `/get-session` returns the whole
 * `{ session, user }` and `session` carries the SESSION TOKEN — a credentialed
 * allow-origin there would let any ecosystem origin, or an XSS on any one of
 * them, lift a live IdP session. `/api/ecosystem/session` is the purpose-built
 * endpoint in gemini/witus: same cookie, but it answers with a display label
 * and nothing else, and its allow-origin list comes from the IdP's own client
 * registry.
 */
export function silentSsoEndpointFromDiscovery(
  discoveryUrl: string | null | undefined
): string | null {
  const parts = splitDiscoveryUrl(discoveryUrl);
  if (!parts) return null;
  return `${parts.origin}/api/ecosystem/session`;
}

/**
 * Read a display name out of the probe response.
 *
 * Shapes handled: `{ signedIn: true, user: { name } }`, a bare user object, and
 * the signed-out answer (`{ signedIn: false }`, or a null body). Anything else
 * yields null, which renders nothing.
 */
export function parseSilentSsoIdentity(payload: unknown): SsoIdentity | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  if (root.signedIn === false) return null;
  const candidate =
    root.user && typeof root.user === 'object' ? (root.user as Record<string, unknown>) : root;
  const label = cleanLabel(candidate.name) ?? cleanLabel(candidate.email);
  return label ? { label } : null;
}

function cleanLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(CONTROL_CHARS, '').trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_LABEL_LENGTH
    ? `${cleaned.slice(0, MAX_LABEL_LENGTH - 1).trimEnd()}…`
    : cleaned;
}

/** Button copy. Kept here so a test pins the exact string the visitor reads. */
export function continueAsLabel(identity: SsoIdentity | null): string {
  return identity ? `Continue as ${identity.label}` : 'Sign in with WitUS';
}

/**
 * The full logout URL to hand the browser after the local session is gone.
 *
 * `post_logout_redirect_uri` must be EXACTLY `<origin>/`, trailing slash and
 * all: better-auth exact-matches it against the client's registered
 * redirectUrls and the IdP registry (gemini/witus lib/identity/clients.ts)
 * registers `origin + "/"`. Drop the slash and the IdP answers 400.
 *
 * `endSessionUrl` already carries `client_id` (baked in on the server, see
 * witusEcosystemServer.ts), hence `&` rather than `?`.
 */
export function endSessionUrlWithReturn(endSessionUrl: string, origin: string): string {
  return `${endSessionUrl}&post_logout_redirect_uri=${encodeURIComponent(`${origin}/`)}`;
}
