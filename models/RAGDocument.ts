import mongoose, { Document, Schema } from 'mongoose';

export interface IRAGDocument extends Document {
  sourceType: 'codebase' | 'help' | 'blog' | 'roadmap' | 'api-docs' | 'pricing';
  sourceId: string;
  title: string;
  content: string;
  vectorId: string;
  lastIndexedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RAGDocumentSchema = new Schema<IRAGDocument>(
  {
    sourceType: {
      type: String,
      required: true,
      enum: ['codebase', 'help', 'blog', 'roadmap', 'api-docs', 'pricing'],
    },
    sourceId: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required.'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Content is required.'],
    },
    vectorId: {
      type: String,
    },
    lastIndexedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

RAGDocumentSchema.index({ sourceType: 1 });
RAGDocumentSchema.index({ sourceId: 1 });

export const RAGDocument =
  mongoose.models.RAGDocument || mongoose.model<IRAGDocument>('RAGDocument', RAGDocumentSchema);
