import mongoose, { Document, Schema } from 'mongoose';

export interface IShareEvent extends Document {
  type: 'versus' | 'results' | 'set';
  resourceId: string;        // challenge code, sessionId, or setId
  utmSource: string;         // 'twitter' | 'facebook' | 'email' | 'copy' | 'native' | 'challenge_preview' | 'direct'
  utmCampaign: string;       // 'versus' | 'results' | 'set'
  clickedAt: Date;
  convertedUserId: mongoose.Types.ObjectId | null;
  convertedAt: Date | null;
}

const ShareEventSchema = new Schema<IShareEvent>(
  {
    type: {
      type: String,
      enum: ['versus', 'results', 'set'],
      required: true,
      index: true,
    },
    resourceId: { type: String, required: true, index: true },
    utmSource: { type: String, default: 'direct' },
    utmCampaign: { type: String, default: '' },
    clickedAt: { type: Date, default: () => new Date(), index: true },
    convertedUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    convertedAt: { type: Date, default: null },
  },
  { timestamps: false }
);

export const ShareEvent =
  mongoose.models.ShareEvent ?? mongoose.model<IShareEvent>('ShareEvent', ShareEventSchema);
