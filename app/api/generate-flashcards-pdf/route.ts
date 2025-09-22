import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { getJobStatus } from '@/lib/cache/redis-cache';
import { Logger, LogContext } from '@/lib/logging/logger';

export async function GET(
  request: NextRequest,
  context: { params: { jobId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { jobId } = await context.params;

  try {
    const jobStatus = await getJobStatus(jobId);
    
    if (!jobStatus) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    await Logger.info(LogContext.STUDY, 'Job status checked', {
      userId: session.user.id,
      jobId,
      status: jobStatus.status
    });

    return NextResponse.json(jobStatus);

  } catch (error) {
    await Logger.error(LogContext.STUDY, 'Failed to get job status', {
      userId: session.user.id,
      jobId,
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { error: 'Failed to get job status' },
      { status: 500 }
    );
  }
}