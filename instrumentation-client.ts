import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

// Client-runtime error monitoring. Reads the PUBLIC DSN, which is inlined at build time.
// Guarded: with no NEXT_PUBLIC_SENTRY_DSN the SDK never initializes, so nothing is sent, no
// network requests are made, and nothing changes for learners.
//
// Note: the browser can only reach the ingest host if the Content-Security-Policy allows it.
// next.config.mjs appends the DSN's origin to connect-src when this var is set.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    // Errors only. No tracing and no session replay (privacy plus cost) until BAM opts in.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}

// Instruments App Router client navigations for Sentry (no-op when not initialized).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
