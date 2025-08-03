/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, model, models, Document } from 'mongoose';

// Interface for strong typing of AppConfig documents
export interface IAppConfig extends Document {
  key: string;
  value: Record<string, any> | string | number;
  description?: string;
}

const AppConfigSchema = new Schema<IAppConfig>({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: Schema.Types.Mixed, // Allows for storing objects, strings, or numbers
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
}, { timestamps: true });

export const AppConfig = models.AppConfig || model<IAppConfig>('AppConfig', AppConfigSchema);
