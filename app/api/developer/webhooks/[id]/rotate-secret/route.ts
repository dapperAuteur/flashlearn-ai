import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { WebhookEndpoint } from '@/models/WebhookEndpoint';
import { encryptWebhookSecret, generateWebhookSecret } from '@/lib/crypto/webhookSecret';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

// POST /api/developer/webhooks/:id/rotate-secret
// Generates a new signing secret, atomically replaces the encrypted one,
// returns the plaintext ONCE. Subsequent webhook deliveries (from this point)
// use the new secret. The consumer must update their verification key
// before the next session.completed event lands or signatures will mismatch.
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Path: /api/developer/webhooks/[id]/rotate-secret → second-to-last segment is [id]
  const segments = request.nextUrl.pathname.split('/');
  const id = segments[segments.length - 2];
  if (!id) return NextResponse.json({ error: 'Endpoint id required.' }, { status: 400 });

  await dbConnect();
  const endpoint = await WebhookEndpoint.findById(id);
  if (!endpoint) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const apiKey = await ApiKey.findOne({ _id: endpoint.apiKeyId, userId: token.id });
  if (!apiKey) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const plaintextSecret = generateWebhookSecret();
  try {
    endpoint.secretEncrypted = encryptWebhookSecret(plaintextSecret);
    await endpoint.save();
  } catch (err) {
    Logger.error(LogContext.SYSTEM, 'Webhook rotate-secret: encrypt failed', {
      metadata: { endpointId: id, error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json(
      { error: 'Server is missing WEBHOOK_ENCRYPTION_KEY. Contact support.' },
      { status: 500 },
    );
  }

  Logger.info(LogContext.SYSTEM, 'Webhook secret rotated', {
    userId: token.id as string,
    metadata: { endpointId: id },
  });

  return NextResponse.json({
    secret: plaintextSecret,
    warning: 'Update your verification code with the new secret immediately. The old secret is no longer accepted.',
  });
}
