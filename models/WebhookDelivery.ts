import mongoose, { Document, Schema, Types } from 'mongoose';

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'dead-letter';

// 7-step backoff schedule. Indexed by attemptNumber (1-based) — index 0 is
// unused. Values are seconds-from-now for the NEXT attempt after this one
// failed. After attempt 7 we mark dead-letter.
export const RETRY_BACKOFF_SECONDS: number[] = [
  0,        // [0] sentinel
  60,       // 1 → 2: 1 min
  5 * 60,   // 2 → 3: 5 min
  30 * 60,  // 3 → 4: 30 min
  2 * 3600, // 4 → 5: 2 h
  6 * 3600, // 5 → 6: 6 h
  16 * 3600,// 6 → 7: 16 h (cumulative ≈ 24h36m)
];

export const MAX_DELIVERY_ATTEMPTS = 7;

export interface IWebhookDelivery extends Document {
  deliveryId: string;
  webhookEndpointId: Types.ObjectId;
  apiKeyId: Types.ObjectId;
  childId?: string;
  event: string;
  payloadSnapshot: Record<string, unknown>;
  signature: string;
  attemptNumber: number;
  lastAttemptAt: Date;
  nextAttemptAt?: Date;
  status: WebhookDeliveryStatus;
  lastResponseStatus?: number;
  lastResponseBodySnippet?: string;
  lastError?: string;
  qstashMessageId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookDeliverySchema = new Schema<IWebhookDelivery>({
  deliveryId: {
    type: String,
    required: true,
    unique: true,
  },
  webhookEndpointId: {
    type: Schema.Types.ObjectId,
    ref: 'WebhookEndpoint',
    required: true,
  },
  apiKeyId: {
    type: Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: true,
    index: true,
  },
  // Denormalized so cascade-delete can sweep without joining payload contents.
  childId: {
    type: String,
    trim: true,
  },
  event: {
    type: String,
    required: true,
  },
  payloadSnapshot: {
    type: Schema.Types.Mixed,
    required: true,
  },
  signature: {
    type: String,
    required: true,
  },
  attemptNumber: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },
  lastAttemptAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  nextAttemptAt: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'dead-letter'],
    default: 'pending',
  },
  lastResponseStatus: { type: Number },
  lastResponseBodySnippet: { type: String, maxlength: 1024 },
  lastError: { type: String, maxlength: 2048 },
  qstashMessageId: { type: String },
}, { timestamps: true });

// Dashboard recent-deliveries (per key, newest first).
WebhookDeliverySchema.index({ apiKeyId: 1, createdAt: -1 });
// Per-endpoint history.
WebhookDeliverySchema.index({ webhookEndpointId: 1, createdAt: -1 });
// Reconciliation sweeper for pending/failed waiting on QStash.
WebhookDeliverySchema.index({ status: 1, nextAttemptAt: 1 });
// Cascade-delete sweep.
WebhookDeliverySchema.index({ apiKeyId: 1, childId: 1 });
// TTL: drop successful deliveries after 30 days. Dead-letter rows stay forever
// for compliance — partial filter excludes them from the TTL.
WebhookDeliverySchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { status: 'success' },
  },
);

export const WebhookDelivery =
  mongoose.models.WebhookDelivery ||
  mongoose.model<IWebhookDelivery>('WebhookDelivery', WebhookDeliverySchema, 'webhook_deliveries');
