/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa from 'papaparse';
import { Logger, LogContext } from '@/lib/logging/client-logger';

// A simple Flashcard interface to use locally
export interface Flashcard {
  front: string;
  back: string;
}

/**
 * Sanitizes a string for use in filenames or localStorage keys.
 * It converts to lowercase, replaces spaces with underscores, and removes invalid characters.
 * @param input - The string to sanitize.
 * @returns The sanitized string, or 'untitled' if the input is empty.
 */
export const sanitizeString = (input: string): string => {
  if (!input) return 'untitled';
  // Replace spaces with underscores, remove most non-alphanumeric chars except hyphen/underscore
  const sanitized = input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^a-z0-9_-]/g, ''); // Remove invalid characters
  // Prevent empty strings or just underscores/hyphens
  return sanitized.replace(/^[_-]+|[_-]+$/g, '') || 'untitled';
};

/**
 * Extracts a human-readable topic name from a formatted localStorage key.
 * @param key - The localStorage key (e.g., 'flashlearn_topic_name_flashcards_csv').
 * @returns The extracted topic name.
 */
export const extractTopicFromKey = (key: string): string => {
  const prefix = 'flashlearn_';
  const suffix = '_flashcards_csv';
  if (key.startsWith(prefix) && key.endsWith(suffix)) {
    const topicPart = key.slice(prefix.length, key.length - suffix.length);
    return topicPart.replace(/_/g, ' '); // Replace underscores back to spaces
  }
  return 'Unknown Topic'; // Fallback
};

/**
 * Processes the parsed data from a CSV file.
 * Validates headers and content, returning flashcards or an error.
 * @param data - The parsed data from PapaParse.
 * @param originalFilename - The name of the uploaded file for logging.
 * @returns An object with either the flashcards array or an error message.
 */
export const processCsvContent = (data: any[], originalFilename: string): { flashcards?: Flashcard[]; error?: string } => {
    const requiredHeaders = ['front', 'back'];
    const headers = data.length > 0 ? Object.keys(data[0]).map(h => h.toLowerCase()) : [];

    if (!requiredHeaders.every(h => headers.includes(h))) {
        const error = `Invalid CSV header. Expected columns: "front,back" (case-insensitive).`;
        Logger.error(LogContext.FLASHCARD, 'Invalid CSV header', { filename: originalFilename, foundHeaders: headers });
        return { error };
    }

    const loadedFlashcards: Flashcard[] = data.map((row: any) => ({
      front: row.front || row.Front,
      back: row.back || row.Back,
    })).filter((card: Flashcard) => card.front && card.back);


    if (loadedFlashcards.length === 0) {
        const error = "CSV file contained a valid header but no valid flashcard data rows.";
        Logger.error(LogContext.FLASHCARD, "No valid data rows in CSV", { filename: originalFilename });
        return { error };
    }
    
    Logger.info(LogContext.FLASHCARD, 'Successfully processed CSV content with PapaParse', { filename: originalFilename, cardCount: loadedFlashcards.length });
    return { flashcards: loadedFlashcards };
};