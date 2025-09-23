import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { checkRateLimit } from '@/lib/ratelimit/rateLimitGemini';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Check rate limit using existing system
    const rateResult = await checkRateLimit(session.user.id);
    if (rateResult.limited) {
      return NextResponse.json({ 
        error: rateResult.reason || 'AI generation rate limit exceeded.' 
      }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    if (file.size > 52428800) { // 50MB limit
      return NextResponse.json({ 
        error: 'File is too large. Maximum size is 50MB.' 
      }, { status: 413 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a PDF file.' 
      }, { status: 400 });
    }

    // For now, return success - implement background processing later
    return NextResponse.json({
      jobId: 'temp-' + Date.now(),
      status: 'uploaded',
      message: 'PDF uploaded successfully. Processing will be implemented.',
      fileName: file.name
    });

  } catch (error) {
    console.error('PDF upload error:', error);
    return NextResponse.json(
      { error: 'An internal error occurred while uploading the PDF.' },
      { status: 500 }
    );
  }
}