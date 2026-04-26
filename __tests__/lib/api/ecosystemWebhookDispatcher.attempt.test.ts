/**
 * @jest-environment node
 */
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { WebhookEndpoint, AUTO_DISABLE_THRESHOLD } from '@/models/WebhookEndpoint';
import { WebhookDelivery, MAX_DELIVERY_ATTEMPTS } from '@/models/WebhookDelivery';
import {
  enqueueDelivery,
  performAttempt,
  type QStashPublisher,
} from '@/lib/api/ecosystemWebhookDispatcher';
import { encryptWebhookSecret } from '@/lib/crypto/webhookSecret';

const TEST_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const SECRET = 'whsec_unit-test-secret';

let mongod: MongoMemoryServer;
let publishCalls: Array<{ url: string; body: { deliveryId: string }; delay?: number }>;
let publisher: QStashPublisher;
let messageIdSeq: number;

beforeAll(async () => {
  process.env.WEBHOOK_ENCRYPTION_KEY = TEST_KEY_HEX;
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
  delete process.env.WEBHOOK_ENCRYPTION_KEY;
});

beforeEach(() => {
  publishCalls = [];
  messageIdSeq = 0;
  publisher = {
    async publishJSON(args) {
      publishCalls.push(args);
      messageIdSeq += 1;
      return { messageId: `msg-${messageIdSeq}` };
    },
  };
});

afterEach(async () => {
  await Promise.all([
    WebhookEndpoint.deleteMany({}),
    WebhookDelivery.deleteMany({}),
  ]);
});

const CALLBACK_URL = 'https://flashlearnai.witus.online/api/v1/qstash/deliver-webhook';

async function createEndpoint(overrides: Partial<{ active: boolean; url: string; events: string[] }> = {}) {
  return WebhookEndpoint.create({
    apiKeyId: new Types.ObjectId(),
    url: overrides.url ?? 'https://example.com/hooks/in',
    secretEncrypted: encryptWebhookSecret(SECRET),
    events: overrides.events ?? ['session.completed'],
    active: overrides.active ?? true,
    consecutiveFailures: 0,
  });
}

describe('enqueueDelivery', () => {
  it('persists a pending WebhookDelivery and publishes one QStash job', async () => {
    const endpoint = await createEndpoint();
    const apiKeyId = endpoint.apiKeyId;

    const { deliveryId, messageId } = await enqueueDelivery(
      {
        endpointId: endpoint._id,
        apiKeyId,
        childId: 'child-123',
        event: 'session.completed',
        payload: { sessionId: 'sess-1', cards: [] },
      },
      publisher,
      CALLBACK_URL,
    );

    expect(deliveryId).toMatch(/^[0-9a-f-]{36}$/);
    expect(publishCalls).toEqual([
      { url: CALLBACK_URL, body: { deliveryId } },
    ]);

    const delivery = await WebhookDelivery.findOne({ deliveryId });
    expect(delivery).not.toBeNull();
    expect(delivery!.status).toBe('pending');
    expect(delivery!.attemptNumber).toBe(1);
    expect(delivery!.qstashMessageId).toBe(messageId);
    expect(delivery!.event).toBe('session.completed');
    expect(delivery!.childId).toBe('child-123');
  });

  it('refuses to enqueue when the endpoint is disabled', async () => {
    const endpoint = await createEndpoint({ active: false });
    await expect(
      enqueueDelivery(
        {
          endpointId: endpoint._id,
          apiKeyId: endpoint.apiKeyId,
          event: 'session.completed',
          payload: {},
        },
        publisher,
        CALLBACK_URL,
      ),
    ).rejects.toThrow(/disabled/);
    expect(publishCalls).toHaveLength(0);
  });

  it('refuses to enqueue when the endpoint is not subscribed to the event', async () => {
    const endpoint = await createEndpoint({ events: ['session.scheduled'] });
    await expect(
      enqueueDelivery(
        {
          endpointId: endpoint._id,
          apiKeyId: endpoint.apiKeyId,
          event: 'session.completed',
          payload: {},
        },
        publisher,
        CALLBACK_URL,
      ),
    ).rejects.toThrow(/not subscribed/);
  });

  it('refuses to enqueue when the endpoint does not exist', async () => {
    await expect(
      enqueueDelivery(
        {
          endpointId: new Types.ObjectId(),
          apiKeyId: new Types.ObjectId(),
          event: 'session.completed',
          payload: {},
        },
        publisher,
        CALLBACK_URL,
      ),
    ).rejects.toThrow(/not found/);
  });
});

describe('performAttempt success path', () => {
  it('marks delivery success on 200, resets endpoint failures, no retry queued', async () => {
    const endpoint = await createEndpoint();
    endpoint.consecutiveFailures = 3;
    await endpoint.save();

    const { deliveryId } = await enqueueDelivery(
      {
        endpointId: endpoint._id,
        apiKeyId: endpoint.apiKeyId,
        event: 'session.completed',
        payload: { hi: 1 },
      },
      publisher,
      CALLBACK_URL,
    );

    publishCalls = []; // reset post-enqueue

    const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }));

    const result = await performAttempt(deliveryId, {
      publisher,
      callbackUrl: CALLBACK_URL,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.status).toBe('success');
    expect(result.responseStatus).toBe(200);
    expect(publishCalls).toHaveLength(0); // no retry

    const delivery = await WebhookDelivery.findOne({ deliveryId });
    expect(delivery!.status).toBe('success');
    expect(delivery!.lastResponseStatus).toBe(200);
    expect(delivery!.nextAttemptAt).toBeNull();

    const reloadedEndpoint = await WebhookEndpoint.findById(endpoint._id);
    expect(reloadedEndpoint!.consecutiveFailures).toBe(0);
    expect(reloadedEndpoint!.lastDeliveryStatus).toBe('success');
  });

  it('signs the body with the endpoint secret and sends the right headers', async () => {
    const endpoint = await createEndpoint();
    const { deliveryId } = await enqueueDelivery(
      {
        endpointId: endpoint._id,
        apiKeyId: endpoint.apiKeyId,
        event: 'session.completed',
        payload: { hello: 'signed' },
      },
      publisher,
      CALLBACK_URL,
    );

    let capturedHeaders: Record<string, string> | undefined;
    let capturedBody: string | undefined;
    const fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>;
      capturedBody = init?.body as string;
      return new Response('', { status: 204 });
    });

    await performAttempt(deliveryId, {
      publisher,
      callbackUrl: CALLBACK_URL,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(capturedHeaders!['Content-Type']).toBe('application/json');
    expect(capturedHeaders!['X-FlashLearn-Delivery']).toBe(deliveryId);
    expect(capturedHeaders!['X-FlashLearn-Event']).toBe('session.completed');
    expect(capturedHeaders!['X-FlashLearn-Signature']).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(capturedHeaders!['User-Agent']).toBe('FlashLearn-Webhooks/2.0');

    // Verify the signature would actually validate consumer-side.
    const { createHmac } = await import('crypto');
    const expectedSig =
      'sha256=' + createHmac('sha256', SECRET).update(capturedBody!).digest('hex');
    expect(capturedHeaders!['X-FlashLearn-Signature']).toBe(expectedSig);
  });

  it('is idempotent: re-running an already-success delivery returns noop', async () => {
    const endpoint = await createEndpoint();
    const { deliveryId } = await enqueueDelivery(
      {
        endpointId: endpoint._id,
        apiKeyId: endpoint.apiKeyId,
        event: 'session.completed',
        payload: {},
      },
      publisher,
      CALLBACK_URL,
    );

    const fetchMock = jest.fn(async () => new Response('ok', { status: 200 }));
    await performAttempt(deliveryId, {
      publisher,
      callbackUrl: CALLBACK_URL,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    fetchMock.mockClear();
    const second = await performAttempt(deliveryId, {
      publisher,
      callbackUrl: CALLBACK_URL,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(second.status).toBe('noop');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('performAttempt failure → retry path', () => {
  it('on 500, schedules next attempt with the documented 60s delay and bumps attemptNumber', async () => {
    const endpoint = await createEndpoint();
    const { deliveryId } = await enqueueDelivery(
      {
        endpointId: endpoint._id,
        apiKeyId: endpoint.apiKeyId,
        event: 'session.completed',
        payload: {},
      },
      publisher,
      CALLBACK_URL,
    );
    publishCalls = [];

    const fetchMock = jest.fn(async () => new Response('boom', { status: 500 }));
    const result = await performAttempt(deliveryId, {
      publisher,
      callbackUrl: CALLBACK_URL,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.status).toBe('failed');
    expect(result.responseStatus).toBe(500);
    expect(publishCalls).toEqual([
      { url: CALLBACK_URL, body: { deliveryId }, delay: 60 },
    ]);

    const delivery = await WebhookDelivery.findOne({ deliveryId });
    expect(delivery!.status).toBe('failed');
    expect(delivery!.attemptNumber).toBe(2);
    expect(delivery!.nextAttemptAt).toBeInstanceOf(Date);
    expect(delivery!.lastResponseStatus).toBe(500);
  });

  it('after MAX_DELIVERY_ATTEMPTS failures, dead-letters with no further retry', async () => {
    const endpoint = await createEndpoint();
    const { deliveryId } = await enqueueDelivery(
      {
        endpointId: endpoint._id,
        apiKeyId: endpoint.apiKeyId,
        event: 'session.completed',
        payload: {},
      },
      publisher,
      CALLBACK_URL,
    );

    // Pretend we've exhausted the schedule.
    await WebhookDelivery.updateOne(
      { deliveryId },
      { attemptNumber: MAX_DELIVERY_ATTEMPTS, status: 'failed' },
    );
    publishCalls = [];

    const fetchMock = jest.fn(async () => new Response('still failing', { status: 503 }));
    const result = await performAttempt(deliveryId, {
      publisher,
      callbackUrl: CALLBACK_URL,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.status).toBe('dead-letter');
    expect(publishCalls).toHaveLength(0);

    const delivery = await WebhookDelivery.findOne({ deliveryId });
    expect(delivery!.status).toBe('dead-letter');
    expect(delivery!.nextAttemptAt).toBeNull();
  });

  it('treats fetch transport errors as failure (records lastError, schedules retry)', async () => {
    const endpoint = await createEndpoint();
    const { deliveryId } = await enqueueDelivery(
      {
        endpointId: endpoint._id,
        apiKeyId: endpoint.apiKeyId,
        event: 'session.completed',
        payload: {},
      },
      publisher,
      CALLBACK_URL,
    );
    publishCalls = [];

    const fetchMock = jest.fn(async () => { throw new Error('ECONNREFUSED'); });
    const result = await performAttempt(deliveryId, {
      publisher,
      callbackUrl: CALLBACK_URL,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.status).toBe('failed');
    expect(result.responseStatus).toBeUndefined();
    expect(publishCalls).toHaveLength(1);

    const delivery = await WebhookDelivery.findOne({ deliveryId });
    expect(delivery!.lastError).toContain('ECONNREFUSED');
  });

  it('crossing AUTO_DISABLE_THRESHOLD failures auto-disables the endpoint and dead-letters in-flight', async () => {
    const endpoint = await createEndpoint();
    endpoint.consecutiveFailures = AUTO_DISABLE_THRESHOLD - 1;
    await endpoint.save();

    const { deliveryId } = await enqueueDelivery(
      {
        endpointId: endpoint._id,
        apiKeyId: endpoint.apiKeyId,
        event: 'session.completed',
        payload: {},
      },
      publisher,
      CALLBACK_URL,
    );
    publishCalls = [];

    const fetchMock = jest.fn(async () => new Response('nope', { status: 500 }));
    const result = await performAttempt(deliveryId, {
      publisher,
      callbackUrl: CALLBACK_URL,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    expect(result.status).toBe('dead-letter');
    expect(publishCalls).toHaveLength(0); // no retry since we disabled

    const reloadedEndpoint = await WebhookEndpoint.findById(endpoint._id);
    expect(reloadedEndpoint!.active).toBe(false);
    expect(reloadedEndpoint!.consecutiveFailures).toBe(AUTO_DISABLE_THRESHOLD);

    const delivery = await WebhookDelivery.findOne({ deliveryId });
    expect(delivery!.status).toBe('dead-letter');
  });

  it('returns noop when the WebhookDelivery row no longer exists', async () => {
    const result = await performAttempt('does-not-exist', {
      publisher,
      callbackUrl: CALLBACK_URL,
      fetchImpl: jest.fn() as unknown as typeof fetch,
    });
    expect(result.status).toBe('noop');
  });

  it('dead-letters when the endpoint was deleted between enqueue and attempt', async () => {
    const endpoint = await createEndpoint();
    const { deliveryId } = await enqueueDelivery(
      {
        endpointId: endpoint._id,
        apiKeyId: endpoint.apiKeyId,
        event: 'session.completed',
        payload: {},
      },
      publisher,
      CALLBACK_URL,
    );
    await WebhookEndpoint.deleteOne({ _id: endpoint._id });

    const result = await performAttempt(deliveryId, {
      publisher,
      callbackUrl: CALLBACK_URL,
      fetchImpl: jest.fn() as unknown as typeof fetch,
    });
    expect(result.status).toBe('dead-letter');

    const delivery = await WebhookDelivery.findOne({ deliveryId });
    expect(delivery!.status).toBe('dead-letter');
    expect(delivery!.lastError).toMatch(/deleted/i);
  });
});
