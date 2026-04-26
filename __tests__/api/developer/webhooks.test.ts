/**
 * @jest-environment node
 *
 * Developer webhook self-service routes:
 *   POST   /api/developer/webhooks                         — create endpoint, return secret once
 *   PATCH  /api/developer/webhooks/:id                     — update url/events/active
 *   DELETE /api/developer/webhooks/:id                     — revoke
 *   POST   /api/developer/webhooks/:id/rotate-secret       — generate new secret, return once
 *   GET    /api/developer/webhooks/:id/deliveries          — paginated history
 *   POST   /api/developer/webhooks/:id/deliveries/:dId/replay — re-enqueue
 */

const TEST_USER_ID = '64a000000000000000000099';
const TEST_OTHER_USER_ID = '64a0000000000000000000aa';
const mockPublishCalls: Array<{ url: string; body: { deliveryId: string } }> = [];

// Stub db modules + auth so we don't need MONGODB_URI / NextAuth.
jest.mock('../../../lib/db/dbConnect', () => ({ __esModule: true, default: jest.fn(async () => {}) }));
jest.mock('../../../lib/db/mongodb', () => ({ __esModule: true, default: Promise.resolve({}) }));

let mockToken: { id?: string; role?: string } | null = { id: TEST_USER_ID, role: 'Admin' };
jest.mock('next-auth/jwt', () => ({
  getToken: async () => mockToken,
}));

jest.mock('../../../lib/qstash/client', () => ({
  qstashPublisher: {
    async publishJSON(args: { url: string; body: { deliveryId: string } }) {
      mockPublishCalls.push(args);
      return { messageId: `mock-msg-${mockPublishCalls.length}` };
    },
  },
}));

import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NextRequest } from 'next/server';
import { ApiKey } from '@/models/ApiKey';
import { WebhookEndpoint } from '@/models/WebhookEndpoint';
import { WebhookDelivery } from '@/models/WebhookDelivery';

import { POST as createEndpoint, GET as listEndpoints } from '@/app/api/developer/webhooks/route';
import { PATCH as patchEndpoint, DELETE as deleteEndpoint } from '@/app/api/developer/webhooks/[id]/route';
import { POST as rotateSecret } from '@/app/api/developer/webhooks/[id]/rotate-secret/route';
import { GET as listDeliveries } from '@/app/api/developer/webhooks/[id]/deliveries/route';
import { POST as replayDelivery } from '@/app/api/developer/webhooks/[id]/deliveries/[deliveryId]/replay/route';

const KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  process.env.WEBHOOK_ENCRYPTION_KEY = KEY;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  delete process.env.WEBHOOK_ENCRYPTION_KEY;
});

beforeEach(() => {
  mockToken = { id: TEST_USER_ID, role: 'Admin' };
  mockPublishCalls.length = 0;
});

afterEach(async () => {
  await Promise.all([
    ApiKey.deleteMany({}),
    WebhookEndpoint.deleteMany({}),
    WebhookDelivery.deleteMany({}),
  ]);
});

function makeReq(method: string, url: string, body?: unknown): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: { 'content-type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(url, init);
}

async function seedKey(userId: string = TEST_USER_ID) {
  // Random suffix so multiple seedKey() calls in one test don't collide on
  // the unique keyPrefix index.
  const suffix = Math.random().toString(36).slice(2, 10);
  return ApiKey.create({
    userId: new Types.ObjectId(userId),
    name: 'Test Key',
    keyType: 'ecosystem',
    keyPrefix: `fl_eco_${suffix}`,
    keyHash: `fakehash-${suffix}`,
    apiTier: 'Free',
    permissions: ['generate', 'kids:*'],
  });
}

describe('POST /api/developer/webhooks', () => {
  it('creates an endpoint and returns the plaintext secret once', async () => {
    const apiKey = await seedKey();
    const res = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(apiKey._id),
      url: 'https://consumer.example.com/wh',
      description: 'prod',
    }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { secret: string; endpoint: { id: string; url: string; events: string[] }; warning: string };
    expect(body.secret).toMatch(/^whsec_/);
    expect(body.endpoint.url).toBe('https://consumer.example.com/wh');
    expect(body.endpoint.events).toEqual(['session.completed']);
    expect(body.warning).toMatch(/won.t be shown again|securely/i);

    const stored = await WebhookEndpoint.findById(body.endpoint.id);
    expect(stored!.secretEncrypted).not.toBe(body.secret);
    expect(stored!.secretEncrypted.startsWith('v1:')).toBe(true);
  });

  it('rejects non-https URLs', async () => {
    const apiKey = await seedKey();
    const res = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(apiKey._id),
      url: 'http://insecure.example.com/wh',
    }));
    expect(res.status).toBe(400);
  });

  it('rejects when the API key is owned by someone else', async () => {
    const otherKey = await seedKey(TEST_OTHER_USER_ID);
    const res = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(otherKey._id),
      url: 'https://example.com/wh',
    }));
    expect(res.status).toBe(404);
  });

  it('rejects unauthenticated requests', async () => {
    mockToken = null;
    const res = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {}));
    expect(res.status).toBe(401);
  });

  it('rejects unknown event names', async () => {
    const apiKey = await seedKey();
    const res = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(apiKey._id),
      url: 'https://example.com/wh',
      events: ['session.completed', 'made.up.event'],
    }));
    expect(res.status).toBe(400);
  });

  it('caps endpoints per key (5)', async () => {
    const apiKey = await seedKey();
    for (let i = 0; i < 5; i++) {
      const res = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
        apiKeyId: String(apiKey._id),
        url: `https://example.com/wh${i}`,
      }));
      expect(res.status).toBe(201);
    }
    const sixth = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(apiKey._id),
      url: 'https://example.com/wh-overflow',
    }));
    expect(sixth.status).toBe(400);
  });

  it('409s on duplicate URL for the same key', async () => {
    const apiKey = await seedKey();
    await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(apiKey._id),
      url: 'https://example.com/dupe',
    }));
    const res = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(apiKey._id),
      url: 'https://example.com/dupe',
    }));
    expect(res.status).toBe(409);
  });
});

describe('GET /api/developer/webhooks', () => {
  it('lists only the caller-owned endpoints', async () => {
    const myKey = await seedKey();
    const otherKey = await seedKey(TEST_OTHER_USER_ID);
    await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(myKey._id), url: 'https://mine.example.com/wh',
    }));
    // Insert an endpoint directly on the other user's key (not via route).
    const { encryptWebhookSecret } = await import('@/lib/crypto/webhookSecret');
    await WebhookEndpoint.create({
      apiKeyId: otherKey._id,
      url: 'https://other.example.com/wh',
      secretEncrypted: encryptWebhookSecret('whsec_other'),
      events: ['session.completed'],
      active: true,
    });

    const res = await listEndpoints(makeReq('GET', 'http://localhost/api/developer/webhooks'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { endpoints: Array<{ url: string }> };
    expect(body.endpoints).toHaveLength(1);
    expect(body.endpoints[0].url).toBe('https://mine.example.com/wh');
  });
});

describe('PATCH /api/developer/webhooks/:id', () => {
  it('toggles active and resets failure counter on re-enable', async () => {
    const apiKey = await seedKey();
    const create = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(apiKey._id), url: 'https://example.com/toggle',
    }));
    const id = ((await create.json()) as { endpoint: { id: string } }).endpoint.id;

    // Simulate a failure streak.
    await WebhookEndpoint.updateOne({ _id: id }, { consecutiveFailures: 12 });

    const res = await patchEndpoint(makeReq('PATCH', `http://localhost/api/developer/webhooks/${id}`, { active: false }));
    expect(res.status).toBe(200);
    expect((await WebhookEndpoint.findById(id))!.active).toBe(false);

    const re = await patchEndpoint(makeReq('PATCH', `http://localhost/api/developer/webhooks/${id}`, { active: true }));
    expect(re.status).toBe(200);
    const reloaded = await WebhookEndpoint.findById(id);
    expect(reloaded!.active).toBe(true);
    expect(reloaded!.consecutiveFailures).toBe(0);
  });

  it('refuses to patch endpoints owned by another user', async () => {
    const otherKey = await seedKey(TEST_OTHER_USER_ID);
    const { encryptWebhookSecret } = await import('@/lib/crypto/webhookSecret');
    const ep = await WebhookEndpoint.create({
      apiKeyId: otherKey._id,
      url: 'https://other.example.com/wh',
      secretEncrypted: encryptWebhookSecret('whsec_other'),
      events: ['session.completed'],
      active: true,
    });
    const res = await patchEndpoint(makeReq('PATCH', `http://localhost/api/developer/webhooks/${ep._id}`, { active: false }));
    expect(res.status).toBe(404);
  });
});

describe('POST /api/developer/webhooks/:id/rotate-secret', () => {
  it('replaces the encrypted secret and returns the new plaintext', async () => {
    const apiKey = await seedKey();
    const create = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(apiKey._id), url: 'https://example.com/rotate',
    }));
    const { secret: originalSecret, endpoint: ep } = (await create.json()) as { secret: string; endpoint: { id: string } };

    const before = await WebhookEndpoint.findById(ep.id);
    const beforeCipher = before!.secretEncrypted;

    const res = await rotateSecret(makeReq('POST', `http://localhost/api/developer/webhooks/${ep.id}/rotate-secret`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { secret: string };
    expect(body.secret).toMatch(/^whsec_/);
    expect(body.secret).not.toBe(originalSecret);

    const after = await WebhookEndpoint.findById(ep.id);
    expect(after!.secretEncrypted).not.toBe(beforeCipher);
  });
});

describe('GET /api/developer/webhooks/:id/deliveries', () => {
  it('returns paginated deliveries scoped to the endpoint', async () => {
    const apiKey = await seedKey();
    const { encryptWebhookSecret } = await import('@/lib/crypto/webhookSecret');
    const ep = await WebhookEndpoint.create({
      apiKeyId: apiKey._id,
      url: 'https://example.com/listd',
      secretEncrypted: encryptWebhookSecret('whsec_x'),
      events: ['session.completed'],
      active: true,
    });
    for (let i = 0; i < 3; i++) {
      await WebhookDelivery.create({
        deliveryId: `del-${i}-${Math.random()}`,
        webhookEndpointId: ep._id,
        apiKeyId: apiKey._id,
        event: 'session.completed',
        payloadSnapshot: { i },
        signature: 'sha256=abc',
        attemptNumber: 1,
        lastAttemptAt: new Date(),
        status: i === 2 ? 'success' : i === 1 ? 'failed' : 'pending',
      });
    }
    const res = await listDeliveries(makeReq('GET', `http://localhost/api/developer/webhooks/${ep._id}/deliveries`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deliveries: Array<{ status: string }>; pagination: { total: number } };
    expect(body.pagination.total).toBe(3);
    expect(body.deliveries).toHaveLength(3);

    const filtered = await listDeliveries(makeReq('GET', `http://localhost/api/developer/webhooks/${ep._id}/deliveries?status=failed`));
    const filteredBody = (await filtered.json()) as { deliveries: Array<{ status: string }> };
    expect(filteredBody.deliveries).toHaveLength(1);
    expect(filteredBody.deliveries[0].status).toBe('failed');
  });
});

describe('POST /api/developer/webhooks/:id/deliveries/:deliveryId/replay', () => {
  it('resets a failed delivery to pending and re-enqueues a QStash callback', async () => {
    const apiKey = await seedKey();
    const { encryptWebhookSecret } = await import('@/lib/crypto/webhookSecret');
    const ep = await WebhookEndpoint.create({
      apiKeyId: apiKey._id,
      url: 'https://example.com/replay',
      secretEncrypted: encryptWebhookSecret('whsec_x'),
      events: ['session.completed'],
      active: true,
    });
    const delivery = await WebhookDelivery.create({
      deliveryId: `del-replay`,
      webhookEndpointId: ep._id,
      apiKeyId: apiKey._id,
      event: 'session.completed',
      payloadSnapshot: { foo: 'bar' },
      signature: 'sha256=abc',
      attemptNumber: 7,
      lastAttemptAt: new Date(),
      status: 'dead-letter',
      lastResponseStatus: 503,
      lastError: 'consumer 5xx',
    });

    const res = await replayDelivery(makeReq('POST', `http://localhost/api/developer/webhooks/${ep._id}/deliveries/${delivery.deliveryId}/replay`));
    expect(res.status).toBe(200);

    const reloaded = await WebhookDelivery.findOne({ deliveryId: 'del-replay' });
    expect(reloaded!.status).toBe('pending');
    expect(reloaded!.attemptNumber).toBe(1);
    expect(reloaded!.lastError).toBeUndefined();
    expect(mockPublishCalls).toHaveLength(1);
    expect(mockPublishCalls[0].body.deliveryId).toBe('del-replay');
  });
});

describe('DELETE /api/developer/webhooks/:id', () => {
  it('removes the endpoint and refuses delete on someone else\'s', async () => {
    const apiKey = await seedKey();
    const create = await createEndpoint(makeReq('POST', 'http://localhost/api/developer/webhooks', {
      apiKeyId: String(apiKey._id), url: 'https://example.com/del',
    }));
    const id = ((await create.json()) as { endpoint: { id: string } }).endpoint.id;

    // Other user attempts delete.
    mockToken = { id: TEST_OTHER_USER_ID, role: 'Admin' };
    const refused = await deleteEndpoint(makeReq('DELETE', `http://localhost/api/developer/webhooks/${id}`));
    expect(refused.status).toBe(404);
    expect(await WebhookEndpoint.countDocuments({ _id: id })).toBe(1);

    // Owner deletes.
    mockToken = { id: TEST_USER_ID, role: 'Admin' };
    const ok = await deleteEndpoint(makeReq('DELETE', `http://localhost/api/developer/webhooks/${id}`));
    expect(ok.status).toBe(200);
    expect(await WebhookEndpoint.countDocuments({ _id: id })).toBe(0);
  });
});
