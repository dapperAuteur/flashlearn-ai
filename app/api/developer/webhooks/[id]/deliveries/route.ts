import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ApiKey } from '@/models/ApiKey';
import { WebhookEndpoint } from '@/models/WebhookEndpoint';
import { WebhookDelivery, type WebhookDeliveryStatus } from '@/models/WebhookDelivery';

const secret = process.env.NEXTAUTH_SECRET;
const VALID_STATUSES: WebhookDeliveryStatus[] = ['pending', 'success', 'failed', 'dead-letter'];
const PAGE_SIZE = 25;

// GET /api/developer/webhooks/:id/deliveries?status=&page=
// Paginated delivery history for a single endpoint.
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Path: /api/developer/webhooks/[id]/deliveries → second-to-last segment is [id]
  const segments = request.nextUrl.pathname.split('/');
  const id = segments[segments.length - 2];

  await dbConnect();
  const endpoint = await WebhookEndpoint.findById(id);
  if (!endpoint) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const apiKey = await ApiKey.findOne({ _id: endpoint.apiKeyId, userId: token.id });
  if (!apiKey) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const statusFilter = request.nextUrl.searchParams.get('status');
  const pageRaw = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;

  const filter: Record<string, unknown> = { webhookEndpointId: endpoint._id };
  if (statusFilter && VALID_STATUSES.includes(statusFilter as WebhookDeliveryStatus)) {
    filter.status = statusFilter;
  }

  const [deliveries, total] = await Promise.all([
    WebhookDelivery.find(filter)
      .select('deliveryId event status attemptNumber lastAttemptAt nextAttemptAt lastResponseStatus lastError createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    WebhookDelivery.countDocuments(filter),
  ]);

  return NextResponse.json({
    deliveries,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    },
  });
}
