import mongoose, { Document, Schema, Types } from 'mongoose';
import { AUTO_DISABLE_THRESHOLD } from '@/lib/api/webhookConstants';

export { AUTO_DISABLE_THRESHOLD };

export type WebhookEventName = 'session.completed' | 'session.scheduled';

export interface IWebhookEndpoint extends Document {
  apiKeyId: Types.ObjectId;
  url: string;
  // AES-256-GCM ciphertext of the plaintext signing secret. We must be able
  // to recover the plaintext to sign outbound bodies (the consumer holds the
  // same plaintext and verifies HMAC against it). See lib/crypto/webhookSecret.ts.
  secretEncrypted: string;
  events: WebhookEventName[];
  description?: string;
  active: boolean;
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: 'success' | 'failed' | 'dead-letter';
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEndpointSchema = new Schema<IWebhookEndpoint>({
  apiKeyId: {
    type: Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: true,
    index: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2048,
    validate: {
      validator: (v: string) => /^https:\/\//i.test(v),
      message: 'Webhook URL must use https://',
    },
  },
  secretEncrypted: {
    type: String,
    required: true,
  },
  events: {
    type: [String],
    enum: ['session.completed', 'session.scheduled'],
    default: ['session.completed'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  active: {
    type: Boolean,
    default: true,
  },
  lastDeliveryAt: { type: Date },
  lastDeliveryStatus: {
    type: String,
    enum: ['success', 'failed', 'dead-letter'],
  },
  consecutiveFailures: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

WebhookEndpointSchema.index({ apiKeyId: 1, active: 1 });
WebhookEndpointSchema.index({ apiKeyId: 1, url: 1 }, { unique: true });

export const WebhookEndpoint =
  mongoose.models.WebhookEndpoint ||
  mongoose.model<IWebhookEndpoint>('WebhookEndpoint', WebhookEndpointSchema, 'webhook_endpoints');
