import mongoose, { Document, Schema } from 'mongoose';

export interface IMessageAttachment {
  url: string;
  type: 'image' | 'video' | 'screenshot';
  filename: string;
  size: number;
  mimeType: string;
}

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: 'user' | 'admin';
  content: string;
  attachments: IMessageAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IMessageAttachment>(
  {
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['image', 'video', 'screenshot'],
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    attachments: {
      type: [AttachmentSchema],
    },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message =
  mongoose.models.Message ||
  mongoose.model<IMessage>('Message', MessageSchema, 'messages');
