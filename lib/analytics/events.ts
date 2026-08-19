/**
 * Event taxonomy for FlashLearnAI.
 *
 * The ecosystem shares ONE PostHog project, separated by the `app` property that
 * posthog-provider registers on load. Two rules keep that project readable, and both
 * are cheap now and expensive to retrofit once data has landed:
 *
 *   1. `snake_case`, object first, verb in past tense — `route_viewed`.
 *   2. NEVER put the app name in the event name. `flashlearn_deck_studied` is wrong:
 *      it makes the same action from two apps look like two events and kills the
 *      cross-app comparison that sharing a project exists to enable. The `app`
 *      property already carries that.
 *
 * Shared lifecycle events (the SHARED_EVENTS block) use identical names in every
 * ecosystem app, so "where do people fall out of sign-in" is answerable across all of
 * them at once. Do not rename these here without renaming them everywhere.
 *
 * See the witus repo's plans/26-posthog-ecosystem-rollout.md for the full contract and
 * lib/analytics/INTEGRATE.md for the integration playbook.
 *
 * NOTE ON THE SLUG: this is "flashlearn", NOT "flashlearnai". The analytics slug is the
 * IDENTITY slug from the witus repo's lib/identity/clients.ts, so a funnel can join a
 * PostHog event to the app that authenticated the user with no translation table in
 * between. It deliberately does NOT match the OpenTelemetry serviceName in
 * otel.config.ts ("flashlearnai") or the flashlearnai.witus.online host — those name a
 * service and a domain; this names an OIDC client. Enforced by the ecosystem's
 * check-posthog-conformance.mjs, which fails the build on a mismatch, because renaming
 * `app` after data has landed splits one app into two series that no back-fill merges
 * cleanly.
 */

/** This app's slug — matches lib/identity/clients.ts in witus. Every event carries it. */
export const ANALYTICS_APP = "flashlearn";

/**
 * Events with identical names across every ecosystem app. Names are contractual.
 */
export const SHARED_EVENTS = {
  signinStarted: "signin_started",
  signinSucceeded: "signin_succeeded",
  signinFailed: "signin_failed",
} as const;

/**
 * Events specific to FlashLearnAI. Route views are the Phase-1 surface: they answer
 * which parts of the app people actually reach, which is the prerequisite for any
 * later funnel work. Add product events (deck studied, session completed) as the
 * questions that need them get asked — an event is cheap to add and effectively
 * permanent in a shared project, so the taxonomy grows on demand, not speculatively.
 */
export const EVENTS = {
  /** An explicit route view. capture_pageview is off — Next's client router would
   *  fire it once and then lie — so route changes are reported deliberately. */
  routeViewed: "route_viewed",
  ...SHARED_EVENTS,
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
