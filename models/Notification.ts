import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'due_cards'
  | 'challenge_invite'
  | 'challenge_complete'
  | 'achievement'
  | 'follower'
  | 'team_invite'
  | 'system';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  href?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['due_cards', 'challenge_invite', 'challenge_complete', 'achievement', 'follower', 'team_invite', 'system'],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    href: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification =
  mongoose.models.Notification ||
  mongoose.model<INotification>('Notification', NotificationSchema);
