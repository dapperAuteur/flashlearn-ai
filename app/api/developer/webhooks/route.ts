import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { WebhookEndpoint, type WebhookEventName } from '@/models/WebhookEndpoint';
import { encryptWebhookSecret, generateWebhookSecret } from '@/lib/crypto/webhookSecret';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

const VALID_EVENTS: WebhookEventName[] = ['session.completed', 'session.scheduled'];
const MAX_ENDPOINTS_PER_KEY = 5;

// GET /api/developer/webhooks
// List webhook endpoints for keys owned by the authenticated user.
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await dbConnect();

  const userKeys = await ApiKey.find({ userId: token.id }).select('_id name keyType keyPrefix').lean();
  const apiKeyIds = userKeys.map((k: { _id: unknown }) => k._id);

  const endpoints = await WebhookEndpoint.find({ apiKeyId: { $in: apiKeyIds } })
    .select('apiKeyId url events description active lastDeliveryAt lastDeliveryStatus consecutiveFailures createdAt updatedAt')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ endpoints, keys: userKeys });
}

// POST /api/developer/webhooks
// Create a new webhook endpoint. Returns the plaintext signing secret ONCE.
// Body: { apiKeyId, url, events?, description? }
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { apiKeyId?: unknown; url?: unknown; events?: unknown; description?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body.apiKeyId !== 'string') {
    return NextResponse.json({ error: 'apiKeyId is required.' }, { status: 400 });
  }
  if (typeof body.url !== 'string' || !/^https:\/\//i.test(body.url)) {
    return NextResponse.json({ error: 'url must be a valid https:// URL.' }, { status: 400 });
  }
  let events: WebhookEventName[] = ['session.completed'];
  if (Array.isArray(body.events)) {
    if (body.events.length === 0) {
      return NextResponse.json({ error: 'events must be a non-empty array if provided.' }, { status: 400 });
    }
    for (const e of body.events) {
      if (!VALID_EVENTS.includes(e as WebhookEventName)) {
        return NextResponse.json(
          { error: `Unknown event: ${String(e)}. Valid: ${VALID_EVENTS.join(', ')}` },
          { status: 400 },
        );
      }
    }
    events = body.events as WebhookEventName[];
  }

  await dbConnect();

  // Confirm the API key belongs to the caller.
  const apiKey = await ApiKey.findOne({ _id: body.apiKeyId, userId: token.id });
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not found or not owned by you.' }, { status: 404 });
  }

  // Per-key endpoint cap.
  const count = await WebhookEndpoint.countDocuments({ apiKeyId: apiKey._id });
  if (count >= MAX_ENDPOINTS_PER_KEY) {
    return NextResponse.json(
      { error: `Max ${MAX_ENDPOINTS_PER_KEY} webhook endpoints per key. Delete one first.` },
      { status: 400 },
    );
  }

  const plaintextSecret = generateWebhookSecret();
  let secretEncrypted: string;
  try {
    secretEncrypted = encryptWebhookSecret(plaintextSecret);
  } catch (err) {
    Logger.error(LogContext.SYSTEM, 'Webhook create: secret encryption failed', {
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json(
      { error: 'Server is missing WEBHOOK_ENCRYPTION_KEY. Contact support.' },
      { status: 500 },
    );
  }

  let endpoint;
  try {
    endpoint = await WebhookEndpoint.create({
      apiKeyId: apiKey._id,
      url: body.url,
      secretEncrypted,
      events,
      description: typeof body.description === 'string' ? body.description : undefined,
      active: true,
      consecutiveFailures: 0,
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      return NextResponse.json({ error: 'A webhook endpoint with that URL already exists for this key.' }, { status: 409 });
    }
    throw err;
  }

  Logger.info(LogContext.SYSTEM, 'Webhook endpoint created', {
    userId: token.id as string,
    metadata: { endpointId: String(endpoint._id), apiKeyId: String(apiKey._id) },
  });

  return NextResponse.json(
    {
      secret: plaintextSecret,
      endpoint: {
        id: endpoint._id,
        apiKeyId: endpoint.apiKeyId,
        url: endpoint.url,
        events: endpoint.events,
        description: endpoint.description,
        active: endpoint.active,
        createdAt: endpoint.createdAt,
      },
      warning: 'Store this secret securely. It will not be shown again.',
    },
    { status: 201 },
  );
}
