import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { v4 as uuidv4 } from 'uuid';
import { authOptions } from '@/lib/auth/auth';
import { queueJob, PDFJobPayload } from '@/lib/queque/qstash-client';
import { 
  updateJobStatus, 
  addUserJob, 
  generateContentHash, 
  getCachedGeneratedFlashcards
} from '@/lib/cache/redis-cache';
import { checkAIGenerationLimit } from '@/lib/ratelimit/rate-limit-integration';
import { incrementGenerationCount } from '@/lib/ratelimit/rateLimitGemini';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';
import { PDF_MAX_SIZE_BYTES, PDF_MAX_SIZE_MB, JOB_STATUS } from '@/lib/constants';
import { Logger, LogContext } from '@/lib/logging/logger';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Check AI rate limit first (1 per hour)
  const aiRateAllowed = await checkAIGenerationLimit(session.user.id);
  if (!aiRateAllowed) {
    return NextResponse.json({ 
      error: 'AI generation rate limit exceeded. Please wait 1 hour before uploading another file.' 
    }, { status: 429 });
  }

  // Rate limiting: 5 uploads per hour per user
  const rateLimiter = getRateLimiter('pdf-upload', 5, 3600);
  const { success } = await rateLimiter.limit(session.user.id);

  if (!success) {
    await Logger.warning(LogContext.STUDY, 'Rate limit exceeded for PDF upload', { 
      userId: session.user.id 
    });
    return NextResponse.json({ 
      error: 'Too many uploads. Please wait before uploading another file.' 
    }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (file.size > PDF_MAX_SIZE_BYTES) {
      return NextResponse.json({ 
        error: `File is too large. The maximum size is ${PDF_MAX_SIZE_MB}MB.` 
      }, { status: 413 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a PDF file.' 
      }, { status: 400 });
    }

    // Generate job ID
    const jobId = uuidv4();

    // Convert file to buffer for caching check
    const fileBuffer = await file.arrayBuffer();
    const fileHash = generateContentHash(Buffer.from(fileBuffer));

    // Check if we already have flashcards for this exact content
    const cachedFlashcards = await getCachedGeneratedFlashcards(fileHash);
    
    if (cachedFlashcards) {
      await Logger.info(LogContext.STUDY, 'Found cached flashcards for PDF', {
        userId: session.user.id,
        jobId,
        fileName: file.name,
        cardCount: cachedFlashcards.length
      });

      // Return immediate result for cached content
      await updateJobStatus(
        jobId, 
        JOB_STATUS.COMPLETED, 
        100, 
        `Generated ${cachedFlashcards.length} flashcards (from cache)`,
        { flashcards: cachedFlashcards, fileName: file.name }
      );

      await addUserJob(session.user.id, jobId);

      return NextResponse.json({
        jobId,
        status: 'completed',
        message: 'Flashcards ready (from cache)',
        flashcards: cachedFlashcards,
        fileName: file.name
      });
    }

    // Create job payload
    const jobPayload: PDFJobPayload = {
      jobId,
      userId: session.user.id,
      fileName: file.name,
      type: 'pdf-generation',
      fileBuffer: Buffer.from(fileBuffer).toString('base64')
    };

    // Initialize job status
    await updateJobStatus(jobId, JOB_STATUS.PENDING, 0, 'Queuing for processing...');
    await addUserJob(session.user.id, jobId);
    
    // Increment AI rate limit
    await incrementGenerationCount(session.user.id);

    // Queue the job
    const messageId = await queueJob(jobPayload);

    await Logger.info(LogContext.STUDY, 'PDF upload successful, job queued', {
      userId: session.user.id,
      jobId,
      messageId,
      fileName: file.name,
      fileSize: file.size
    });

    return NextResponse.json({
      jobId,
      status: 'processing',
      message: 'PDF uploaded successfully. Processing in background...',
      fileName: file.name
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await Logger.error(LogContext.STUDY, 'PDF upload failed', {
      userId: session.user.id,
      error: errorMessage
    });

    return NextResponse.json(
      { error: 'An internal error occurred while uploading the PDF.' },
      { status: 500 }
    );
  }
}