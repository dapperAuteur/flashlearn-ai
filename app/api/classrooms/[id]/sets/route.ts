/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Classroom } from '@/models/Classroom';
import { FlashcardSet } from '@/models/FlashcardSet';
import { createActivityEvent } from '@/lib/services/activityService';

interface Params {
  params: Promise<{ id: string }>;
}

// GET - List shared sets for a classroom
export async function GET(_request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await dbConnect();

    const classroom = await Classroom.findById(id)
      .populate({
        path: 'sharedSets',
        model: FlashcardSet,
        select: 'title cardCount description isPublic',
      })
      .lean() as any;

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Only teacher or enrolled students can view
    const isTeacher = classroom.teacherId.toString() === session.user.id;
    const isStudent = classroom.students.some(
      (s: any) => s.toString() === session.user.id,
    );

    if (!isTeacher && !isStudent) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ sets: classroom.sharedSets });
  } catch (error) {
    console.error('Error fetching classroom sets:', error);
    return NextResponse.json({ error: 'Failed to fetch classroom sets' }, { status: 500 });
  }
}

// POST - Share a set to the classroom
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { setId } = await request.json();

    if (!setId) {
      return NextResponse.json({ error: 'setId is required' }, { status: 400 });
    }

    await dbConnect();

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Only the teacher can share sets
    if (classroom.teacherId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Only the teacher can share sets' }, { status: 403 });
    }

    // Verify the set exists
    const set = await FlashcardSet.findById(setId).select('_id').lean();
    if (!set) {
      return NextResponse.json({ error: 'Flashcard set not found' }, { status: 404 });
    }

    // Check if already shared
    const alreadyShared = classroom.sharedSets.some(
      (s: { toString: () => string }) => s.toString() === setId,
    );
    if (alreadyShared) {
      return NextResponse.json({ error: 'This set is already shared with the classroom' }, { status: 400 });
    }

    classroom.sharedSets.push(setId);
    await classroom.save();

    createActivityEvent(session.user.id, 'set_shared', {
      setId,
      classroomId: id,
      scope: 'classroom',
    }).catch(() => {
      // fire-and-forget
    });

    return NextResponse.json({ success: true, sharedSetsCount: classroom.sharedSets.length });
  } catch (error) {
    console.error('Error sharing set to classroom:', error);
    return NextResponse.json({ error: 'Failed to share set to classroom' }, { status: 500 });
  }
}
