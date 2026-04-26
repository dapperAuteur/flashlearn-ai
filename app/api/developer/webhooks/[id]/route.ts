import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { WebhookEndpoint, type WebhookEventName } from '@/models/WebhookEndpoint';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;
const VALID_EVENTS: WebhookEventName[] = ['session.completed', 'session.scheduled'];

async function loadOwnedEndpoint(token: { id?: unknown }, id: string) {
  const endpoint = await WebhookEndpoint.findById(id);
  if (!endpoint) return null;
  const apiKey = await ApiKey.findOne({ _id: endpoint.apiKeyId, userId: token.id });
  if (!apiKey) return null;
  return endpoint;
}

// PATCH /api/developer/webhooks/:id
// Body: { url?, events?, description?, active? }
export async function PATCH(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.pathname.split('/').pop() ?? '';
  if (!id) return NextResponse.json({ error: 'Endpoint id required.' }, { status: 400 });

  let body: { url?: unknown; events?: unknown; description?: unknown; active?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  await dbConnect();
  const endpoint = await loadOwnedEndpoint(token, id);
  if (!endpoint) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  if (typeof body.url === 'string') {
    if (!/^https:\/\//i.test(body.url)) {
      return NextResponse.json({ error: 'url must be a valid https:// URL.' }, { status: 400 });
    }
    endpoint.url = body.url;
  }
  if (Array.isArray(body.events)) {
    if (body.events.length === 0) {
      return NextResponse.json({ error: 'events cannot be empty.' }, { status: 400 });
    }
    for (const e of body.events) {
      if (!VALID_EVENTS.includes(e as WebhookEventName)) {
        return NextResponse.json({ error: `Unknown event: ${String(e)}` }, { status: 400 });
      }
    }
    endpoint.events = body.events as WebhookEventName[];
  }
  if (typeof body.description === 'string') endpoint.description = body.description;
  if (typeof body.active === 'boolean') {
    endpoint.active = body.active;
    // Re-enabling resets the failure counter so the endpoint isn't auto-disabled
    // again by stale streak data.
    if (body.active) endpoint.consecutiveFailures = 0;
  }

  try {
    await endpoint.save();
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: number }).code === 11000) {
      return NextResponse.json({ error: 'Another webhook with that URL exists for this key.' }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({
    endpoint: {
      id: endpoint._id,
      apiKeyId: endpoint.apiKeyId,
      url: endpoint.url,
      events: endpoint.events,
      description: endpoint.description,
      active: endpoint.active,
      consecutiveFailures: endpoint.consecutiveFailures,
      lastDeliveryAt: endpoint.lastDeliveryAt,
      lastDeliveryStatus: endpoint.lastDeliveryStatus,
      updatedAt: endpoint.updatedAt,
    },
  });
}

// DELETE /api/developer/webhooks/:id
export async function DELETE(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = request.nextUrl.pathname.split('/').pop() ?? '';

  await dbConnect();
  const endpoint = await loadOwnedEndpoint(token, id);
  if (!endpoint) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  await WebhookEndpoint.deleteOne({ _id: endpoint._id });

  Logger.info(LogContext.SYSTEM, 'Webhook endpoint deleted', {
    userId: token.id as string,
    metadata: { endpointId: id },
  });

  return NextResponse.json({ deleted: true });
}
