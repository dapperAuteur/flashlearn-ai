// Define a size limit for uploads (e.g., 50MB)
import { GoogleGenerativeAI } from '@google/generative-ai';

// Define limits for file uploads
export const FILE_SIZE_LIMIT_MB = 50;
export const FILE_SIZE_LIMIT_BYTES = FILE_SIZE_LIMIT_MB * 1024 * 1024;

// Define limits for generating flashcards
export const FLASHCARD_MIN = 5;
export const FLASHCARD_MAX = 20;

// Define limits for image uploads
export const IMAGE_MAX_FILES = 10;
export const IMAGE_MAX_FILE_SIZE_MB = 4;
export const IMAGE_MAX_FILE_SIZE_BYTES = IMAGE_MAX_FILE_SIZE_MB * 1024 * 1024;


// Using a multimodal model is essential for this task.
// AI Model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
export const MODEL = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });