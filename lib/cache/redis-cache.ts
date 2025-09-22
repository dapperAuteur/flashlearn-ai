/* eslint-disable @typescript-eslint/no-explicit-any */
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { JobStatus, CACHE_TTL } from '@/lib/constants';
import { Logger, LogContext } from '@/lib/logging/logger';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache key patterns
const KEYS = {
  EXTRACTED_TEXT: (hash: string) => `extracted:${hash}`,
  GENERATED_FLASHCARDS: (hash: string) => `flashcards:${hash}`,
  JOB_STATUS: (jobId: string) => `job:${jobId}`,
  USER_JOBS: (userId: string) => `user:${userId}:jobs`,
} as const;

export interface JobStatusData {
  status: JobStatus;
  progress: number;
  message: string;
  createdAt: number;
  updatedAt: number;
  result?: any;
  error?: string;
}

/**
 * Generate hash for content caching
 */
export function generateContentHash(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Cache extracted text from files
 */
export async function cacheExtractedText(
  fileHash: string,
  extractedText: string
): Promise<void> {
  try {
    const key = KEYS.EXTRACTED_TEXT(fileHash);
    await redis.setex(key, CACHE_TTL.EXTRACTED_TEXT, extractedText);
    
    await Logger.info(LogContext.SYSTEM, 'Cached extracted text', {
      fileHash: fileHash.substring(0, 8),
      textLength: extractedText.length,
    });
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, 'Failed to cache extracted text', {
      fileHash: fileHash.substring(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get cached extracted text
 */
export async function getCachedExtractedText(fileHash: string): Promise<string | null> {
  try {
    const key = KEYS.EXTRACTED_TEXT(fileHash);
    const result = await redis.get<string>(key);
    
    if (result) {
      await Logger.info(LogContext.SYSTEM, 'Cache hit for extracted text', {
        fileHash: fileHash.substring(0, 8),
      });
    }
    
    return result;
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, 'Failed to get cached extracted text', {
      fileHash: fileHash.substring(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Cache generated flashcards
 */
export async function cacheGeneratedFlashcards(
  contentHash: string,
  flashcards: any[]
): Promise<void> {
  try {
    const key = KEYS.GENERATED_FLASHCARDS(contentHash);
    await redis.setex(key, CACHE_TTL.GENERATED_FLASHCARDS, JSON.stringify(flashcards));
    
    await Logger.info(LogContext.SYSTEM, 'Cached generated flashcards', {
      contentHash: contentHash.substring(0, 8),
      cardCount: flashcards.length,
    });
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, 'Failed to cache generated flashcards', {
      contentHash: contentHash.substring(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get cached generated flashcards
 */
export async function getCachedGeneratedFlashcards(contentHash: string): Promise<any[] | null> {
  try {
    const key = KEYS.GENERATED_FLASHCARDS(contentHash);
    const result = await redis.get<string>(key);
    
    if (result) {
      await Logger.info(LogContext.SYSTEM, 'Cache hit for generated flashcards', {
        contentHash: contentHash.substring(0, 8),
      });
      return JSON.parse(result);
    }
    
    return null;
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, 'Failed to get cached generated flashcards', {
      contentHash: contentHash.substring(0, 8),
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  progress: number = 0,
  message: string = '',
  result?: any,
  error?: string
): Promise<void> {
  try {
    const key = KEYS.JOB_STATUS(jobId);
    const data: JobStatusData = {
      status,
      progress,
      message,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...(result && { result }),
      ...(error && { error }),
    };
    
    // Get existing data to preserve createdAt
    const existing = await redis.get<JobStatusData>(key);
    if (existing) {
      data.createdAt = existing.createdAt;
    }
    
    await redis.setex(key, CACHE_TTL.JOB_STATUS, JSON.stringify(data));
    
    await Logger.info(LogContext.SYSTEM, 'Updated job status', {
      jobId,
      status,
      progress,
      message,
    });
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, 'Failed to update job status', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<JobStatusData | null> {
  try {
    const key = KEYS.JOB_STATUS(jobId);
    const result = await redis.get<string>(key);
    
    if (result) {
      return JSON.parse(result);
    }
    
    return null;
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, 'Failed to get job status', {
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Add job to user's job list
 */
export async function addUserJob(userId: string, jobId: string): Promise<void> {
  try {
    const key = KEYS.USER_JOBS(userId);
    await redis.lpush(key, jobId);
    await redis.expire(key, CACHE_TTL.JOB_STATUS);
    
    await Logger.info(LogContext.SYSTEM, 'Added job to user list', {
      userId,
      jobId,
    });
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, 'Failed to add job to user list', {
      userId,
      jobId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get user's recent jobs
 */
export async function getUserJobs(userId: string, limit: number = 10): Promise<string[]> {
  try {
    const key = KEYS.USER_JOBS(userId);
    const jobs = await redis.lrange(key, 0, limit - 1);
    return jobs;
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, 'Failed to get user jobs', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}