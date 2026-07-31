import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

// Server-runtime error monitoring (Better Stack ingest, via the Sentry SDK).
// Loaded from instrumentation.ts's register() on the Node runtime.
//
// GUARDED ON THE DSN: with no SENTRY_DSN set, init is skipped entirely and the SDK is inert, so
// the app builds, ships, and runs exactly as it did before until BAM provisions a Better Stack
// source and sets the var (see plans/user-tasks).
const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Errors only for now. No performance/tracing volume until BAM opts in.
    tracesSampleRate: 0,
    // Never auto-attach IP / cookies / user email. The beforeSend scrub is the second line of defense.
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}
