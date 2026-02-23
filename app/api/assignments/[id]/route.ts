import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Assignment } from '@/models/Assignment';

// GET - Get assignment details with student progress
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await dbConnect();
    const assignment = await Assignment.findById(id)
      .populate('flashcardSetId', 'title cardCount description')
      .populate('classroomId', 'name')
      .populate('teacherId', 'name email')
      .populate('studentProgress.studentId', 'name email')
      .lean();

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error('Error fetching assignment:', error);
    return NextResponse.json({ error: 'Failed to fetch assignment' }, { status: 500 });
  }
}

// PUT - Update student progress (student completing assignment)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { status, accuracy, sessionId } = await request.json();

    await dbConnect();
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Find the student's progress entry
    const progressEntry = assignment.studentProgress.find(
      (p: { studentId: { toString: () => string } }) => p.studentId.toString() === session.user.id,
    );

    if (!progressEntry) {
      return NextResponse.json({ error: 'You are not assigned to this assignment' }, { status: 403 });
    }

    progressEntry.status = status || progressEntry.status;
    if (accuracy !== undefined) progressEntry.accuracy = accuracy;
    if (sessionId) progressEntry.sessionId = sessionId;
    if (status === 'completed') progressEntry.completedAt = new Date();

    await assignment.save();

    return NextResponse.json({ success: true, progress: progressEntry });
  } catch (error) {
    console.error('Error updating assignment progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
