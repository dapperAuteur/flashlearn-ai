import { Schema, model, models } from 'mongoose';
import { IApiLog } from '@/types/api';

const ApiLogSchema = new Schema<IApiLog>({
  apiKeyId: {
    type: Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: true,
  },
  keyType: {
    type: String,
    enum: ['admin', 'app', 'public', 'admin_public', 'ecosystem'],
    required: true,
  },
  endpoint: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
  statusCode: {
    type: Number,
    required: true,
  },
  responseTimeMs: {
    type: Number,
    required: true,
  },
  ip: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// TTL index: auto-delete logs after 90 days
ApiLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// Query by key for per-key analytics
ApiLogSchema.index({ apiKeyId: 1, timestamp: -1 });
// Query by key type for admin dashboard
ApiLogSchema.index({ keyType: 1, timestamp: -1 });
// Query by endpoint for usage patterns
ApiLogSchema.index({ endpoint: 1, timestamp: -1 });

export const ApiLog = models.ApiLog || model<IApiLog>('ApiLog', ApiLogSchema);
