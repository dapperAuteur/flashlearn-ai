import mongoose, { Document, Schema, Types } from 'mongoose';

// Append-only COPPA receipt. Doubles as the idempotency anchor for repeat
// DELETE /api/v1/children/:childId calls — once a row exists, subsequent
// deletes return 200 with purgedRecordCount: 0 instead of 404.
export interface ICascadePurgeLog extends Document {
  apiKeyId: Types.ObjectId;
  childId: string;
  requestedAt: Date;
  completedAt: Date;
  purgedRecordCount: number;
  byCollection: Record<string, number>;
  requesterIp: string;
  requestId: string;
  createdAt: Date;
}

const CascadePurgeLogSchema = new Schema<ICascadePurgeLog>({
  apiKeyId: {
    type: Schema.Types.ObjectId,
    ref: 'ApiKey',
    required: true,
    index: true,
  },
  childId: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  requestedAt: {
    type: Date,
    required: true,
  },
  completedAt: {
    type: Date,
    required: true,
  },
  purgedRecordCount: {
    type: Number,
    required: true,
    min: 0,
  },
  byCollection: {
    type: Schema.Types.Mixed,
    required: true,
  },
  requesterIp: {
    type: String,
    default: '',
  },
  requestId: {
    type: String,
    required: true,
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

CascadePurgeLogSchema.index({ apiKeyId: 1, childId: 1, requestedAt: -1 });

export const CascadePurgeLog =
  mongoose.models.CascadePurgeLog ||
  mongoose.model<ICascadePurgeLog>('CascadePurgeLog', CascadePurgeLogSchema, 'cascade_purge_logs');
