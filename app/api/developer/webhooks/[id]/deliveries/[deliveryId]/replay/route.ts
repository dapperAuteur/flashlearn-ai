import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { WebhookEndpoint } from '@/models/WebhookEndpoint';
import { WebhookDelivery } from '@/models/WebhookDelivery';
import { qstashPublisher } from '@/lib/qstash/client';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

// POST /api/developer/webhooks/:id/deliveries/:deliveryId/replay
// Re-enqueues a settled delivery (success or dead-letter) by resetting the
// row to attemptNumber=1, status='pending', and publishing a new immediate
// QStash callback. Used to redeliver a webhook that failed AND that the
// developer has fixed their endpoint to handle.
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Path: /api/developer/webhooks/[id]/deliveries/[deliveryId]/replay
  // → trailing segment is 'replay', deliveryId is two before, endpointId four before
  const segments = request.nextUrl.pathname.split('/');
  const deliveryId = segments[segments.length - 2];
  const endpointId = segments[segments.length - 4];

  if (!deliveryId || !endpointId) {
    return NextResponse.json({ error: 'deliveryId and endpoint id required.' }, { status: 400 });
  }

  await dbConnect();

  const endpoint = await WebhookEndpoint.findById(endpointId);
  if (!endpoint) return NextResponse.json({ error: 'Endpoint not found.' }, { status: 404 });

  const apiKey = await ApiKey.findOne({ _id: endpoint.apiKeyId, userId: token.id });
  if (!apiKey) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const delivery = await WebhookDelivery.findOne({ deliveryId, webhookEndpointId: endpoint._id });
  if (!delivery) return NextResponse.json({ error: 'Delivery not found.' }, { status: 404 });

  // Reset the delivery to a fresh-attempt state so performAttempt() will
  // POST to the consumer immediately when QStash fires the callback.
  delivery.status = 'pending';
  delivery.attemptNumber = 1;
  delivery.nextAttemptAt = undefined;
  delivery.lastError = undefined;
  delivery.lastResponseStatus = undefined;
  delivery.lastResponseBodySnippet = undefined;
  await delivery.save();

  const callbackUrl = new URL('/api/v1/qstash/deliver-webhook', request.url).toString();
  try {
    const { messageId } = await qstashPublisher.publishJSON({
      url: callbackUrl,
      body: { deliveryId: delivery.deliveryId },
    });
    delivery.qstashMessageId = messageId;
    await delivery.save();
  } catch (err) {
    Logger.warning(LogContext.SYSTEM, 'Webhook replay: QStash publish failed', {
      metadata: { deliveryId, error: err instanceof Error ? err.message : String(err) },
    });
    return NextResponse.json(
      { error: 'Failed to enqueue replay. The delivery is reset to pending; try again or contact support.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ replayed: true, deliveryId });
}
