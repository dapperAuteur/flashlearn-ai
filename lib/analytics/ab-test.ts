// lib/analytics/ab-test.ts
//
// Edge-safe core for the homepage A/B test. This module is imported by the
// Edge middleware, the server page selector, and the client tracker, so it must
// NOT import mongoose, the DB, or any Node-only API. Persistence lives in
// app/api/analytics/ab-test/route.ts and models/ABTestEvent.ts.

/** The experiment key persisted with every event. Lets the model hold more than one test. */
export const HOME_AB_TEST_NAME = "home-hero";

/** Cookie that pins a visitor to a variant so server render and client match (no flash). */
export const HOME_AB_COOKIE = "fl_home_variant";

/** 90 days, in seconds. A homepage test runs long enough to reach significance. */
export const HOME_AB_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

/** localStorage key the client tracker uses to keep one session id per browser. */
export const HOME_AB_SESSION_KEY = "fl_ab_session_id";

/**
 * Registered variants. `control` is the current production homepage; a/b/c are
 * the alternate designs in components/home/HomeVariant{A,B,C}.tsx. Add a key
 * here and a branch in the page selector to grow the test.
 */
export const HOME_VARIANTS = ["control", "a", "b", "c"] as const;
export type HomeVariant = (typeof HOME_VARIANTS)[number];

/** Events we record. Click events are inferred from CTA destinations on the homepage. */
export const HOME_AB_EVENTS = [
  "view",
  "signup_click",
  "signin_click",
  "generate_click",
  "study_click",
  "dashboard_click",
] as const;
export type HomeAbEvent = (typeof HOME_AB_EVENTS)[number];

/** True only when explicitly switched on. Default OFF keeps production on `control`. */
export function isHomeAbTestEnabled(): boolean {
  return process.env.HOMEPAGE_AB_TEST_ENABLED === "true";
}

/** Coerce an untrusted cookie value to a known variant, defaulting to `control`. */
export function normalizeHomeVariant(value: string | undefined | null): HomeVariant {
  return (HOME_VARIANTS as readonly string[]).includes(value ?? "")
    ? (value as HomeVariant)
    : "control";
}

/** Type guard for an event name arriving from the client. */
export function isHomeAbEvent(value: unknown): value is HomeAbEvent {
  return typeof value === "string" && (HOME_AB_EVENTS as readonly string[]).includes(value);
}

/**
 * Assign a visitor to a variant with an even split. Uses Web Crypto where
 * available (Edge, browsers, Node 18+) and falls back to Math.random so this
 * never throws and never blocks a homepage render.
 */
export function assignHomeVariant(): HomeVariant {
  let index: number;
  try {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    index = buf[0] % HOME_VARIANTS.length;
  } catch {
    index = Math.floor(Math.random() * HOME_VARIANTS.length);
  }
  return HOME_VARIANTS[index];
}

/**
 * Map a homepage CTA destination to the click event it represents, or null when
 * the link is not part of the funnel. Pure so the client tracker and tests can
 * share it. Order matters: check the most specific paths first.
 */
export function eventForHref(href: string | null | undefined): HomeAbEvent | null {
  if (!href) return null;
  // Strip origin so absolute and relative hrefs match the same way.
  let path = href;
  try {
    path = new URL(href, "https://flashlearnai.witus.online").pathname;
  } catch {
    /* href was already a path */
  }
  if (path.startsWith("/auth/signup")) return "signup_click";
  if (path.startsWith("/auth/signin")) return "signin_click";
  if (path.startsWith("/generate")) return "generate_click";
  if (path.startsWith("/study") || path.startsWith("/flashcards")) return "study_click";
  if (path.startsWith("/dashboard")) return "dashboard_click";
  return null;
}
