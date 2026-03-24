// Define a size limit for uploads (e.g., 50MB)
import { GoogleGenerativeAI } from '@google/generative-ai';

// Define limits for file uploads
export const FILE_SIZE_LIMIT_MB = 50;
export const FILE_SIZE_LIMIT_BYTES = FILE_SIZE_LIMIT_MB * 1024 * 1024;

// Define limits for generating flashcards
export const FLASHCARD_MIN = 5;
export const FLASHCARD_MAX = 20;

// Admin-specific limits for custom quantity generation
export const ADMIN_FLASHCARD_MIN = 1;
export const ADMIN_FLASHCARD_MAX = 50;

// Define limits for image uploads
export const IMAGE_MAX_FILES = 10;
export const IMAGE_MAX_FILE_SIZE_MB = 4;
export const IMAGE_MAX_FILE_SIZE_BYTES = IMAGE_MAX_FILE_SIZE_MB * 1024 * 1024;


// AI Model Configuration
// Each API key type uses its own Gemini API key for separate cost tracking.
// Falls back to GEMINI_API_KEY if a type-specific key is not set.
const GEMINI_MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';

const geminiKeys = {
  admin: process.env.GEMINI_API_KEY_ADMIN || process.env.GEMINI_API_KEY || '',
  app: process.env.GEMINI_API_KEY_APP || process.env.GEMINI_API_KEY || '',
  public: process.env.GEMINI_API_KEY_PUBLIC || process.env.GEMINI_API_KEY || '',
  admin_public: process.env.GEMINI_API_KEY_ADMIN_PUBLIC || process.env.GEMINI_API_KEY || '',
};

// Default model instance (uses legacy GEMINI_API_KEY for existing internal routes)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
export const MODEL = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });

/**
 * Returns a Gemini model instance configured with the API key for the given key type.
 * This allows separate billing/quota tracking per key type in Google Cloud.
 * @param {string} keyType - One of: 'admin', 'app', 'public', 'admin_public'
 * @returns {GenerativeModel} A configured Gemini model instance
 */
export function getModelForKeyType(keyType) {
  const apiKey = geminiKeys[keyType] || process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenerativeAI(apiKey);
  return ai.getGenerativeModel({ model: GEMINI_MODEL_NAME });
}

export { GEMINI_MODEL_NAME, geminiKeys };