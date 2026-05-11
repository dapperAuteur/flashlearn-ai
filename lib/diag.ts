/**
 * [DIAGNOSTIC SCAFFOLDING — strip after we find the 4a-no-sync root cause.]
 *
 * Fire-and-forget client-side checkpoint ping. In production the codebase's
 * Logger.log calls are silent client-side (logToConsole=false; Mongo writes
 * fail from the browser), so we have no visibility into the review-list
 * completion flow when /api/study/sessions/sync never POSTs.
 *
 * This helper sends a tiny JSON body to /api/_diag/checkpoint so the event
 * surfaces in Vercel function logs. Use it at every client-side decision
 * point until the no-sync mystery is solved, then strip both this file and
 * the endpoint.
 */
export function clientCheckpoint(
  event: string,
  data?: Record<string, unknown>,
  sessionId?: string,
): void {
  if (typeof window === 'undefined') return;
  try {
    void fetch('/api/_diag/checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, sessionId, data }),
      keepalive: true,
    }).catch(() => {
      /* fire-and-forget — diagnostic must never break the flow it instruments */
    });
  } catch {
    /* fire-and-forget */
  }
}
