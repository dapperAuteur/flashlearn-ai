import { Schema, model, models } from 'mongoose';
import { IApiUsage } from '@/types/api';

const ApiUsageSchema = new Schema<IApiUsage>({
  apiKeyId: {
    type: Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: [true, 'API Key ID is required.'],
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required.'],
  },
  keyType: {
    type: String,
    enum: ['admin', 'app', 'public', 'admin_public', 'ecosystem'],
    required: true,
  },
  periodStart: {
    type: Date,
    required: true,
  },
  periodEnd: {
    type: Date,
    required: true,
  },
  apiCalls: {
    type: Number,
    default: 0,
  },
  generationCalls: {
    type: Number,
    default: 0,
  },
  overageCalls: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// One usage record per key per billing period
ApiUsageSchema.index({ apiKeyId: 1, periodStart: 1 }, { unique: true });
// Query by user across all their keys
ApiUsageSchema.index({ userId: 1, periodStart: 1 });
// Query by key type for admin dashboard aggregation
ApiUsageSchema.index({ keyType: 1, periodStart: 1 });

export const ApiUsage = models.ApiUsage || model<IApiUsage>('ApiUsage', ApiUsageSchema);
