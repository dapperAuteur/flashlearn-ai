import { NextRequest, NextResponse } from 'next/server';

/**
 * [DIAGNOSTIC SCAFFOLDING — strip after we find the 4a-no-sync root cause.]
 *
 * Unauthenticated POST endpoint that prints client-side checkpoint events to
 * Vercel function logs. Why this exists: in production, the codebase's
 * client-side Logger.log calls go silent (logToConsole=false; Mongo writes
 * fail from the browser), so we can't see what happens during the review-list
 * completion flow when the /api/study/sessions/sync POST never fires.
 *
 * Body: { event: string, sessionId?: string, data?: Record<string, unknown> }
 *
 * Logged fields are intentionally narrow — booleans, lengths, counts. No full
 * user ids, no captions, no card content. Strip in a follow-up commit once
 * the root cause is identified.
 */
export async function POST(request: NextRequest) {
  let event = 'unknown';
  let sessionId: string | undefined;
  let data: unknown = null;
  try {
    const body = await request.json();
    if (body && typeof body === 'object') {
      event = typeof body.event === 'string' ? body.event : 'unknown';
      sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined;
      data = body.data ?? null;
    }
  } catch {
    /* fall through with defaults */
  }

  console.info('[diag:checkpoint]', {
    event,
    sessionId,
    data,
    ua: request.headers.get('user-agent')?.slice(0, 80),
  });

  return NextResponse.json({ ok: true });
}
