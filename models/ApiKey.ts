import { Schema, model, models } from 'mongoose';
import { IApiKey } from '@/types/api';

const ApiKeySchema = new Schema<IApiKey>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required.'],
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Key name is required.'],
    trim: true,
    maxlength: [100, 'Key name must be at most 100 characters.'],
  },
  keyType: {
    type: String,
    enum: ['admin', 'app', 'public', 'admin_public', 'ecosystem'],
    required: [true, 'Key type is required.'],
  },
  keyPrefix: {
    type: String,
    required: true,
    unique: true,
  },
  keyHash: {
    type: String,
    required: true,
    unique: true,
  },
  apiTier: {
    type: String,
    enum: ['Free', 'Developer', 'Pro', 'Enterprise'],
    default: 'Free',
  },
  status: {
    type: String,
    enum: ['active', 'revoked', 'expired'],
    default: 'active',
  },
  permissions: [{
    type: String,
    trim: true,
  }],
  customRateLimits: {
    burstPerMinute: { type: Number },
    monthlyGenerations: { type: Number },
    monthlyApiCalls: { type: Number },
  },
  // Enterprise: IP allowlisting (empty array = all IPs allowed)
  allowedIPs: [{
    type: String,
    trim: true,
  }],
  // Enterprise: Webhook URL for usage milestone notifications
  webhookUrl: {
    type: String,
    trim: true,
  },
  // Enterprise: Priority support flag
  prioritySupport: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
  },
  lastUsedAt: {
    type: Date,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  revokedAt: {
    type: Date,
  },
}, { timestamps: true });

// Compound indexes for common queries
ApiKeySchema.index({ userId: 1, status: 1, keyType: 1 });
// keyHash and keyPrefix are already uniquely indexed by `unique: true` on their
// fields; re-declaring them here triggered Mongoose's duplicate-index warning.

export const ApiKey = models.ApiKey || model<IApiKey>('ApiKey', ApiKeySchema);
