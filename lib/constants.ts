import { GoogleGenerativeAI } from '@google/generative-ai';

// AI Configuration
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
export const MODEL = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// File Size Limits (with fallback defaults)
export const PDF_MAX_SIZE_BYTES = parseInt(process.env.PDF_MAX_SIZE_BYTES || '52428800'); // 50MB
export const IMAGE_MAX_SIZE_BYTES = parseInt(process.env.IMAGE_MAX_SIZE_BYTES || '10485760'); // 10MB
export const AUDIO_MAX_SIZE_BYTES = parseInt(process.env.AUDIO_MAX_SIZE_BYTES || '104857600'); // 100MB
export const VIDEO_MAX_SIZE_BYTES = parseInt(process.env.VIDEO_MAX_SIZE_BYTES || '209715200'); // 200MB

// File Count Limits
export const IMAGE_MAX_FILES = parseInt(process.env.IMAGE_MAX_FILES || '10');

// Flashcard Generation Limits
export const FLASHCARD_MIN = parseInt(process.env.FLASHCARD_MIN || '5');
export const FLASHCARD_MAX = parseInt(process.env.FLASHCARD_MAX || '50');

// Convert bytes to MB for display
export const PDF_MAX_SIZE_MB = Math.round(PDF_MAX_SIZE_BYTES / 1024 / 1024);
export const IMAGE_MAX_SIZE_MB = Math.round(IMAGE_MAX_SIZE_BYTES / 1024 / 1024);
export const AUDIO_MAX_SIZE_MB = Math.round(AUDIO_MAX_SIZE_BYTES / 1024 / 1024);
export const VIDEO_MAX_SIZE_MB = Math.round(VIDEO_MAX_SIZE_BYTES / 1024 / 1024);

// Legacy constants for backward compatibility
export const FILE_SIZE_LIMIT_BYTES = PDF_MAX_SIZE_BYTES;
export const FILE_SIZE_LIMIT_MB = PDF_MAX_SIZE_MB;
export const IMAGE_MAX_FILE_SIZE_BYTES = IMAGE_MAX_SIZE_BYTES;
export const IMAGE_MAX_FILE_SIZE_MB = IMAGE_MAX_SIZE_MB;

// Job Processing
export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS];

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  EXTRACTED_TEXT: 60 * 60 * 24 * 7, // 7 days
  GENERATED_FLASHCARDS: 60 * 60 * 24 * 30, // 30 days
  JOB_STATUS: 60 * 60 * 24, // 24 hours
} as const;