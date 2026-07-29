import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

// Next.js instrumentation hook. Loads the right Sentry config per runtime, and reports
// server-side App Router errors via onRequestError. Everything stays inert without a
// SENTRY_DSN, because each config guards its own init (see sentry.*.config.ts).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

// Captures errors thrown while rendering or serving a request. No-op when the SDK never
// initialized, so this costs nothing until a DSN is configured.
export const onRequestError: Instrumentation.onRequestError = Sentry.captureRequestError;
