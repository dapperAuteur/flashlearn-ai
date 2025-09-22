import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import { verifySignature, PDFJobPayload } from '@/lib/queque/qstash-client';
import { 
  updateJobStatus, 
  generateContentHash, 
  cacheExtractedText, 
  getCachedExtractedText,
  cacheGeneratedFlashcards 
} from '@/lib/cache/redis-cache';
import { sendGenerationCompleteEmail, sendGenerationFailedEmail } from '@/lib/email/templates/notification/email';
import { FLASHCARD_MIN, FLASHCARD_MAX, MODEL, JOB_STATUS } from '@/lib/constants';
import { Logger, LogContext } from '@/lib/logging/logger';
import { User } from '@/models/User';
import dbConnect from '@/lib/db/dbConnect';

export async function POST(request: NextRequest) {
  // Verify QStash signature
  const signature = request.headers.get('upstash-signature');
  const body = await request.text();
  
  if (!signature || !verifySignature(signature, body, process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY!)) {
    await Logger.warning(LogContext.SYSTEM, 'Invalid QStash signature for PDF processing');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: PDFJobPayload;
  try {
    payload = JSON.parse(body) as PDFJobPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { jobId, userId, fileName, fileBuffer } = payload;

  try {
    await Logger.info(LogContext.STUDY, 'Starting PDF processing job', { jobId, userId, fileName });
    
    // Update status to processing
    await updateJobStatus(jobId, JOB_STATUS.PROCESSING, 10, 'Extracting text from PDF...');

    // Convert base64 back to buffer
    const pdfBuffer = Buffer.from(fileBuffer, 'base64');
    const fileHash = generateContentHash(pdfBuffer);

    // Check for cached extracted text
    let extractedText = await getCachedExtractedText(fileHash);
    
    if (!extractedText) {
      // Extract text from PDF
      const pdfData = await pdf(pdfBuffer);
      extractedText = pdfData.text;

      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error('Could not extract meaningful text from the PDF. The PDF might be image-based or corrupted.');
      }

      // Cache the extracted text
      await cacheExtractedText(fileHash, extractedText);
      await updateJobStatus(jobId, JOB_STATUS.PROCESSING, 30, 'Text extracted, generating flashcards...');
    } else {
      await updateJobStatus(jobId, JOB_STATUS.PROCESSING, 30, 'Using cached text, generating flashcards...');
    }

    // Generate content hash for flashcard caching
    const contentHash = generateContentHash(extractedText);

    // Generate flashcards using AI
    const prompt = `
      Based on the following text extracted from a PDF, generate a set of ${FLASHCARD_MIN} to ${FLASHCARD_MAX} flashcards
      that capture the key concepts, definitions, and important information.

      PDF Text (first 30000 characters): "${extractedText.substring(0, 30000)}" 
      
      Please respond with ONLY a valid JSON array of objects. Each object should represent a flashcard
      and have two properties: "front" (the question or term) and "back" (the answer or definition).
      Do not include any text, explanation, or markdown formatting before or after the JSON array.
    `;

    await updateJobStatus(jobId, JOB_STATUS.PROCESSING, 60, 'AI generating flashcards...');

    const result = await MODEL.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    // Clean and parse the response
    const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const flashcards = JSON.parse(jsonText);

    if (!Array.isArray(flashcards) || flashcards.length === 0) {
      throw new Error('AI failed to generate valid flashcards from the content.');
    }

    // Cache the generated flashcards
    await cacheGeneratedFlashcards(contentHash, flashcards);

    // Update job status to completed
    await updateJobStatus(
      jobId, 
      JOB_STATUS.COMPLETED, 
      100, 
      `Successfully generated ${flashcards.length} flashcards`,
      { flashcards, fileName }
    );

    // Send email notification
    await connectAndSendEmail(userId, fileName, flashcards.length, jobId);

    await Logger.info(LogContext.STUDY, 'PDF processing job completed successfully', {
      jobId,
      userId,
      fileName,
      cardCount: flashcards.length
    });

    return NextResponse.json({ success: true, cardCount: flashcards.length });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
    
    await Logger.error(LogContext.STUDY, 'PDF processing job failed', {
      jobId,
      userId,
      fileName,
      error: errorMessage
    });

    // Update job status to failed
    await updateJobStatus(
      jobId, 
      JOB_STATUS.FAILED, 
      0, 
      'Processing failed',
      undefined,
      errorMessage
    );

    // Send failure email notification
    await connectAndSendFailureEmail(userId, fileName, errorMessage);

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function connectAndSendEmail(userId: string, fileName: string, cardCount: number, jobId: string) {
  try {
    await dbConnect();
    const user = await User.findById(userId).select('email name');
    
    if (user?.email) {
      await sendGenerationCompleteEmail(
        user.email,
        user.name || 'User',
        fileName,
        cardCount,
        jobId
      );
    }
  } catch (error) {
    await Logger.warning(LogContext.SYSTEM, 'Failed to send completion email', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function connectAndSendFailureEmail(userId: string, fileName: string, error: string) {
  try {
    await dbConnect();
    const user = await User.findById(userId).select('email name');
    
    if (user?.email) {
      await sendGenerationFailedEmail(
        user.email,
        user.name || 'User',
        fileName,
        error
      );
    }
  } catch (emailError) {
    await Logger.warning(LogContext.SYSTEM, 'Failed to send failure email', {
      userId,
      error: emailError instanceof Error ? emailError.message : String(emailError)
    });
  }
}