import { Client } from '@upstash/qstash';
import { Logger, LogContext } from '@/lib/logging/logger';
import crypto from 'crypto';

// Initialize QStash client
export const qstash = new Client({
  token: process.env.UPSTASH_QSTASH_TOKEN!,
});

// Job types for type safety
export type JobType = 'pdf-generation' | 'image-generation' | 'audio-generation' | 'video-generation';

export interface BaseJobPayload {
  jobId: string;
  userId: string;
  fileName: string;
  type: JobType;
}

export interface PDFJobPayload extends BaseJobPayload {
  type: 'pdf-generation';
  fileBuffer: string; // base64 encoded
}

export interface ImageJobPayload extends BaseJobPayload {
  type: 'image-generation';
  files: Array<{
    name: string;
    type: string;
    buffer: string; // base64 encoded
  }>;
}

export interface AudioJobPayload extends BaseJobPayload {
  type: 'audio-generation';
  fileBuffer: string; // base64 encoded
  mimeType: string;
}

export interface VideoJobPayload extends BaseJobPayload {
  type: 'video-generation';
  fileBuffer: string; // base64 encoded
  mimeType: string;
}

export type JobPayload = PDFJobPayload | ImageJobPayload | AudioJobPayload | VideoJobPayload;

/**
 * Queue a job for background processing
 */
export async function queueJob(payload: JobPayload, delaySeconds = 0): Promise<string> {
  try {
    const endpoint = getJobEndpoint(payload.type);
    const delay = delaySeconds > 0 ? new Date(Date.now() + delaySeconds * 1000) : undefined;

    const message = await qstash.publishJSON({
      url: `${process.env.NEXTAUTH_URL}/api/jobs/${endpoint}`,
      body: payload,
      ...(delay && { notBefore: Math.floor(delay.getTime() / 1000) }),
    });

    await Logger.info(LogContext.SYSTEM, `Queued ${payload.type} job`, {
      messageId: message.messageId,
      jobId: payload.jobId,
      userId: payload.userId,
    });

    return message.messageId;
  } catch (error) {
    await Logger.error(LogContext.SYSTEM, `Failed to queue ${payload.type} job`, {
      jobId: payload.jobId,
      userId: payload.userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get the appropriate endpoint for job type
 */
function getJobEndpoint(type: JobType): string {
  switch (type) {
    case 'pdf-generation':
      return 'process-pdf';
    case 'image-generation':
      return 'process-images';
    case 'audio-generation':
      return 'process-audio';
    case 'video-generation':
      return 'process-video';
    default:
      throw new Error(`Unknown job type: ${type}`);
  }
}

/**
 * Verify QStash webhook signature
 */
export function verifySignature(
  signature: string,
  body: string,
  signingKey: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(body);
    const expectedSignature = hmac.digest('base64');
    return signature === expectedSignature;
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to verify QStash signature', { error });
    return false;
  }
}