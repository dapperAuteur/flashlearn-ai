import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { verifyQStashRequest, qstashPublisher } from '@/lib/qstash/client';
import { performAttempt } from '@/lib/api/ecosystemWebhookDispatcher';
import { Logger, LogContext } from '@/lib/logging/logger';

// QStash callback for outbound webhook deliveries. QStash POSTs here with the
// `Upstash-Signature` header; we verify before doing any work. The body is a
// minimal `{ deliveryId }` envelope — the dispatcher loads everything else
// from the WebhookDelivery row, which avoids putting PII in QStash payloads.
//
// We always return 200 (even on failure) so QStash doesn't retry — the
// dispatcher owns retry policy and reschedules itself by publishing a new
// QStash job with a delay.
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signature = req.headers.get('upstash-signature');

  const verified = await verifyQStashRequest(signature, rawBody);
  if (!verified) {
    Logger.warning(LogContext.SYSTEM, 'QStash deliver-webhook: signature verification failed', {
      metadata: { hasSignature: signature !== null },
    });
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid QStash signature' } },
      { status: 401 },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  const deliveryId =
    typeof parsed === 'object' && parsed !== null && 'deliveryId' in parsed
      ? (parsed as { deliveryId: unknown }).deliveryId
      : undefined;

  if (typeof deliveryId !== 'string' || deliveryId.length === 0) {
    return NextResponse.json(
      { error: { code: 'INVALID_INPUT', message: 'deliveryId is required' } },
      { status: 400 },
    );
  }

  await dbConnect();

  // The callback URL we'd use for the next retry. Built from the request URL
  // so dev/preview/prod each self-reference correctly.
  const callbackUrl = new URL(req.url).toString();

  try {
    const result = await performAttempt(deliveryId, {
      publisher: qstashPublisher,
      callbackUrl,
    });
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (err) {
    Logger.error(LogContext.SYSTEM, 'QStash deliver-webhook: performAttempt threw', {
      metadata: { deliveryId, error: err instanceof Error ? err.message : String(err) },
    });
    // Still return 200 — we own retry, and we don't want QStash to redeliver
    // a doomed callback. The reconciliation sweeper will pick this up.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

// QStash uses POST; reject other methods explicitly.
export function GET(): NextResponse {
  return NextResponse.json(
    { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } },
    { status: 405 },
  );
}
