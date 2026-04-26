import mongoose, { Document, Schema, Types } from 'mongoose';

export type WebhookEventName = 'session.completed' | 'session.scheduled';

// Auto-disable threshold: an endpoint that fails this many deliveries
// in a row gets `active: false` so we stop wasting QStash credits and
// the developer sees a clear signal in the dashboard.
export const AUTO_DISABLE_THRESHOLD = 50;

export interface IWebhookEndpoint extends Document {
  apiKeyId: Types.ObjectId;
  url: string;
  secretHash: string;
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
  secretHash: {
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
