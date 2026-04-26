import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { verifyQStashRequest } from '@/lib/qstash/client';
import { EcosystemSession } from '@/models/EcosystemSession';
import { Logger, LogContext } from '@/lib/logging/logger';

// QStash callback fired at scheduledFor for each EcosystemSession. Marks the
// session 'delivered' so the consumer's poll/webhook side knows it can serve
// the deck. Idempotent: hitting an already-delivered (or completed/purged)
// session is a no-op success.
//
// We always return 200 — QStash MUST NOT retry; we own the lifecycle.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get('upstash-signature');

  if (!(await verifyQStashRequest(signature, rawBody))) {
    Logger.warning(LogContext.SYSTEM, 'QStash deliver-session: signature verification failed', {
      metadata: { hasSignature: signature !== null },
    });
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid QStash signature' } },
      { status: 401 },
    );
  }

  let parsed: { deliveryId?: unknown };
  try {
    parsed = JSON.parse(rawBody) as { deliveryId?: unknown };
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  // We send `{ deliveryId: sessionId }` from POST /sessions for symmetry
  // with the webhook callback envelope.
  const sessionId = typeof parsed.deliveryId === 'string' ? parsed.deliveryId : null;
  if (!sessionId) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'deliveryId (sessionId) is required' } },
      { status: 400 },
    );
  }

  await dbConnect();

  const session = await EcosystemSession.findOne({ sessionId });
  if (!session) {
    // Already purged or never existed. Either way we acknowledge so QStash
    // moves on.
    return NextResponse.json({ ok: true, status: 'noop' }, { status: 200 });
  }

  if (session.status === 'scheduled') {
    session.status = 'delivered';
    await session.save();
    return NextResponse.json({ ok: true, status: 'delivered' }, { status: 200 });
  }

  return NextResponse.json({ ok: true, status: session.status }, { status: 200 });
}

export function GET(): NextResponse {
  return NextResponse.json(
    { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } },
    { status: 405 },
  );
}
