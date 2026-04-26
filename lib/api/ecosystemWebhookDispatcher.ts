import { createHmac, randomUUID } from 'crypto';
import type { Types } from 'mongoose';
import { WebhookEndpoint, type WebhookEventName } from '@/models/WebhookEndpoint';
import { WebhookDelivery } from '@/models/WebhookDelivery';
import {
  AUTO_DISABLE_THRESHOLD,
  MAX_DELIVERY_ATTEMPTS,
  RETRY_BACKOFF_SECONDS,
} from '@/lib/api/webhookConstants';
import { decryptWebhookSecret } from '@/lib/crypto/webhookSecret';

const USER_AGENT = 'FlashLearn-Webhooks/2.0';
const FETCH_TIMEOUT_MS = 10_000;
const RESPONSE_BODY_SNIPPET_BYTES = 1024;

// Reasonable max-age the consumer can use to reject replay attempts.
// Documented in the public webhook reference. Not enforced server-side
// (consumers verify against this).
export const SIGNATURE_MAX_AGE_SECONDS = 5 * 60;

export interface EnqueueArgs {
  endpointId: Types.ObjectId | string;
  apiKeyId: Types.ObjectId | string;
  childId?: string;
  event: WebhookEventName;
  payload: Record<string, unknown>;
}

export interface SignedDelivery {
  rawBody: string;
  signature: string;
  deliveryId: string;
  timestamp: number;
}

// Sign a payload exactly the way we'll send it. Sign once; the bytes signed
// MUST equal the bytes posted, so callers should never re-stringify.
export function signPayload(rawBody: string, secret: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
}

// Pure helper exposed for tests + for the future consumer-side verification
// docs. Builds the canonical signing input given a JSON payload + secret.
export function buildSignedDelivery(
  payload: Record<string, unknown>,
  secret: string,
  deliveryId?: string,
): SignedDelivery {
  const rawBody = JSON.stringify(payload);
  const signature = signPayload(rawBody, secret);
  return {
    rawBody,
    signature,
    deliveryId: deliveryId ?? randomUUID(),
    timestamp: Math.floor(Date.now() / 1000),
  };
}

// Headers we send on every webhook attempt. The signature is over the raw
// body (not the headers); the timestamp is informational only — included so
// consumers can implement replay protection if they choose.
function buildHeaders(args: {
  signature: string;
  deliveryId: string;
  event: string;
  timestamp: number;
}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-FlashLearn-Signature': args.signature,
    'X-FlashLearn-Delivery': args.deliveryId,
    'X-FlashLearn-Event': args.event,
    'X-FlashLearn-Timestamp': String(args.timestamp),
    'User-Agent': USER_AGENT,
  };
}

// Compute the delay (in seconds) between attempt N (just failed) and
// attempt N+1. Returns null after the last attempt — caller dead-letters.
export function nextRetryDelaySeconds(failedAttempt: number): number | null {
  if (failedAttempt >= MAX_DELIVERY_ATTEMPTS) return null;
  return RETRY_BACKOFF_SECONDS[failedAttempt] ?? null;
}

// Persist a new pending delivery and enqueue a QStash job for the first
// attempt. The QStash callback will be POST /api/v1/qstash/deliver-webhook.
//
// The QStash publish is dependency-injected so unit tests can swap it for a
// spy. Production wires this to lib/qstash/client.ts.
export interface QStashPublisher {
  publishJSON(args: {
    url: string;
    body: { deliveryId: string };
    delay?: number;
  }): Promise<{ messageId: string }>;
}

export async function enqueueDelivery(
  args: EnqueueArgs,
  publisher: QStashPublisher,
  callbackUrl: string,
): Promise<{ deliveryId: string; messageId: string }> {
  const endpoint = await WebhookEndpoint.findById(args.endpointId);
  if (!endpoint) {
    throw new Error(`WebhookEndpoint ${String(args.endpointId)} not found`);
  }
  if (!endpoint.active) {
    throw new Error(`WebhookEndpoint ${String(args.endpointId)} is disabled`);
  }
  if (!endpoint.events.includes(args.event)) {
    throw new Error(
      `WebhookEndpoint ${String(args.endpointId)} not subscribed to event ${args.event}`,
    );
  }

  const secret = decryptWebhookSecret(endpoint.secretEncrypted);
  const signed = buildSignedDelivery(args.payload, secret);

  const delivery = await WebhookDelivery.create({
    deliveryId: signed.deliveryId,
    webhookEndpointId: endpoint._id,
    apiKeyId: args.apiKeyId,
    childId: args.childId,
    event: args.event,
    payloadSnapshot: args.payload,
    signature: signed.signature,
    attemptNumber: 1,
    lastAttemptAt: new Date(),
    status: 'pending',
  });

  const { messageId } = await publisher.publishJSON({
    url: callbackUrl,
    body: { deliveryId: signed.deliveryId },
  });

  delivery.qstashMessageId = messageId;
  await delivery.save();

  return { deliveryId: signed.deliveryId, messageId };
}

// Perform a single delivery attempt. Called from the QStash callback.
// On success: marks status=success, resets endpoint failure counter.
// On failure: schedules the next attempt via QStash, OR dead-letters if
// we've exhausted the schedule.
//
// Idempotent: if the delivery is already settled (success / dead-letter),
// returns without doing work — handles QStash redelivering a callback after
// a brief network hiccup.
export interface AttemptOptions {
  publisher: QStashPublisher;
  callbackUrl: string;
  // Injectable for tests — defaults to global fetch in production.
  fetchImpl?: typeof fetch;
  // Injectable clock for deterministic tests.
  now?: () => Date;
}

export interface AttemptResult {
  status: 'success' | 'failed' | 'dead-letter' | 'noop';
  responseStatus?: number;
  nextAttemptAt?: Date | null;
}

export async function performAttempt(
  deliveryId: string,
  opts: AttemptOptions,
): Promise<AttemptResult> {
  const fetchFn = opts.fetchImpl ?? fetch;
  const nowFn = opts.now ?? (() => new Date());

  const delivery = await WebhookDelivery.findOne({ deliveryId });
  if (!delivery) {
    return { status: 'noop' };
  }
  if (delivery.status === 'success' || delivery.status === 'dead-letter') {
    // QStash redelivered an already-settled callback. No-op.
    return { status: 'noop' };
  }

  const endpoint = await WebhookEndpoint.findById(delivery.webhookEndpointId);
  if (!endpoint) {
    delivery.status = 'dead-letter';
    delivery.lastError = 'WebhookEndpoint deleted';
    delivery.lastAttemptAt = nowFn();
    delivery.nextAttemptAt = null;
    await delivery.save();
    return { status: 'dead-letter' };
  }

  if (!endpoint.active) {
    // Endpoint was disabled (e.g. auto-disabled by a sibling delivery
    // crossing the failure threshold). Stop retrying.
    delivery.status = 'dead-letter';
    delivery.lastError = 'WebhookEndpoint disabled before delivery';
    delivery.lastAttemptAt = nowFn();
    delivery.nextAttemptAt = null;
    await delivery.save();
    return { status: 'dead-letter' };
  }

  const headers = buildHeaders({
    signature: delivery.signature,
    deliveryId: delivery.deliveryId,
    event: delivery.event,
    timestamp: Math.floor(nowFn().getTime() / 1000),
  });

  const rawBody = JSON.stringify(delivery.payloadSnapshot);

  let responseStatus: number | undefined;
  let responseBodySnippet: string | undefined;
  let transportError: string | undefined;

  try {
    const response = await fetchFn(endpoint.url, {
      method: 'POST',
      headers,
      body: rawBody,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    responseStatus = response.status;
    try {
      const text = await response.text();
      responseBodySnippet = text.slice(0, RESPONSE_BODY_SNIPPET_BYTES);
    } catch {
      // ignore body-read errors; status code already captured.
    }
  } catch (err) {
    transportError = err instanceof Error ? err.message : String(err);
  }

  const isSuccess = responseStatus !== undefined && responseStatus >= 200 && responseStatus < 300;

  const now = nowFn();
  delivery.lastAttemptAt = now;
  delivery.lastResponseStatus = responseStatus;
  delivery.lastResponseBodySnippet = responseBodySnippet;
  delivery.lastError = transportError;

  if (isSuccess) {
    delivery.status = 'success';
    delivery.nextAttemptAt = null;
    await delivery.save();
    if (endpoint.consecutiveFailures > 0) {
      endpoint.consecutiveFailures = 0;
    }
    endpoint.lastDeliveryAt = now;
    endpoint.lastDeliveryStatus = 'success';
    await endpoint.save();
    return { status: 'success', responseStatus };
  }

  // Failure path — decide retry vs dead-letter.
  const failedAttempt = delivery.attemptNumber;
  const delaySeconds = nextRetryDelaySeconds(failedAttempt);

  if (delaySeconds === null) {
    delivery.status = 'dead-letter';
    delivery.nextAttemptAt = null;
    await delivery.save();

    endpoint.consecutiveFailures = (endpoint.consecutiveFailures ?? 0) + 1;
    endpoint.lastDeliveryAt = now;
    endpoint.lastDeliveryStatus = 'dead-letter';
    if (endpoint.consecutiveFailures >= AUTO_DISABLE_THRESHOLD) {
      endpoint.active = false;
    }
    await endpoint.save();

    console.warn('[ecosystem-webhook] dead-lettered', {
      deliveryId,
      event: delivery.event,
      endpointUrl: endpoint.url,
      attempts: failedAttempt,
      lastResponseStatus: responseStatus,
      transportError,
    });
    return { status: 'dead-letter', responseStatus };
  }

  // Schedule the next attempt via QStash. Bump attemptNumber + nextAttemptAt
  // BEFORE publishing so the queue + DB stay aligned even if publish fails
  // (the reconciliation sweeper picks up rows whose nextAttemptAt is past).
  delivery.attemptNumber = failedAttempt + 1;
  const nextAttemptAt = new Date(now.getTime() + delaySeconds * 1000);
  delivery.nextAttemptAt = nextAttemptAt;
  delivery.status = 'failed';
  await delivery.save();

  endpoint.consecutiveFailures = (endpoint.consecutiveFailures ?? 0) + 1;
  endpoint.lastDeliveryAt = now;
  endpoint.lastDeliveryStatus = 'failed';
  if (endpoint.consecutiveFailures >= AUTO_DISABLE_THRESHOLD) {
    endpoint.active = false;
  }
  await endpoint.save();

  if (!endpoint.active) {
    // Crossed the auto-disable threshold on this very failure. Dead-letter
    // the in-flight delivery instead of scheduling a doomed retry.
    delivery.status = 'dead-letter';
    delivery.nextAttemptAt = null;
    await delivery.save();
    return { status: 'dead-letter', responseStatus };
  }

  try {
    const { messageId } = await opts.publisher.publishJSON({
      url: opts.callbackUrl,
      body: { deliveryId },
      delay: delaySeconds,
    });
    delivery.qstashMessageId = messageId;
    await delivery.save();
  } catch (err) {
    console.warn('[ecosystem-webhook] QStash retry publish failed; sweeper will recover', {
      deliveryId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Intentionally do NOT throw — the row remains status=failed with
    // nextAttemptAt set; a reconciliation sweep can pick it up.
  }

  return {
    status: 'failed',
    responseStatus,
    nextAttemptAt,
  };
}
