/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/dbConnect';
import { authOptions } from '@/lib/auth/auth';
import { Logger, LogContext } from '@/lib/logging/logger';
import { StudySession } from '@/models/StudySession';

/**
 * POST /api/study/sessions/[id]/share
 * Toggles isShareable on a session owned by the authenticated user.
 * Returns the new sharing state and the public URL.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await context.params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Find by sessionId field first, then by _id
    let studySession: any = await StudySession.findOne({ sessionId });
    if (!studySession && mongoose.isValidObjectId(sessionId)) {
      studySession = await StudySession.findById(sessionId);
    }

    if (!studySession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify ownership
    if (studySession.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Toggle isShareable
    studySession.isShareable = !studySession.isShareable;
    await studySession.save();

    const host = request.headers.get('host') || 'localhost:3000';
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const protocol = forwardedProto || (host.includes('localhost') ? 'http' : 'https');
    const shareUrl = `${protocol}://${host}/results/${studySession.sessionId}`;

    await Logger.info(LogContext.STUDY, 'Session sharing toggled', {
      userId: session.user.id,
      metadata: { sessionId: studySession.sessionId, isShareable: studySession.isShareable }
    });

    return NextResponse.json({
      isShareable: studySession.isShareable,
      shareUrl: studySession.isShareable ? shareUrl : null,
      sessionId: studySession.sessionId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await Logger.error(LogContext.STUDY, `Error toggling session sharing: ${errorMessage}`, {
      metadata: { sessionId }
    });
    return NextResponse.json({ error: 'Failed to update sharing' }, { status: 500 });
  }
}
