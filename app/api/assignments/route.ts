import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Assignment } from '@/models/Assignment';
import { Classroom } from '@/models/Classroom';

// GET - List assignments for the current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = new mongoose.Types.ObjectId(session.user.id);
  const role = session.user.role;

  await dbConnect();

  let assignments;
  if (['Teacher', 'Tutor', 'SchoolAdmin', 'Admin'].includes(role)) {
    // Teachers see assignments they created
    assignments = await Assignment.find({ teacherId: userId })
      .populate('flashcardSetId', 'title cardCount')
      .populate('classroomId', 'name')
      .sort({ createdAt: -1 })
      .lean();
  } else {
    // Students see assignments assigned to them
    assignments = await Assignment.find({ studentIds: userId })
      .populate('flashcardSetId', 'title cardCount')
      .populate('classroomId', 'name')
      .populate('teacherId', 'name')
      .sort({ dueDate: 1 })
      .lean();

    // Add current student's progress to each assignment
    assignments = assignments.map((a) => {
      const progress = a.studentProgress?.find(
        (p: { studentId: { toString: () => string } }) => p.studentId?.toString() === session.user.id,
      );
      return {
        ...a,
        myStatus: progress?.status || 'not_started',
        myAccuracy: progress?.accuracy,
      };
    });
  }

  return NextResponse.json({ assignments });
}

// POST - Create a new assignment (teacher only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedRoles = ['Teacher', 'Tutor', 'SchoolAdmin', 'Admin'];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Only teachers can create assignments' }, { status: 403 });
  }

  try {
    const { title, flashcardSetId, classroomId, dueDate } = await request.json();

    if (!title?.trim() || !flashcardSetId || !classroomId) {
      return NextResponse.json(
        { error: 'Title, flashcard set, and classroom are required' },
        { status: 400 },
      );
    }

    await dbConnect();

    // Get students from the classroom
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Verify teacher owns this classroom
    if (classroom.teacherId.toString() !== session.user.id && session.user.role !== 'Admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const studentIds = classroom.students;

    // Initialize progress for each student
    const studentProgress = studentIds.map((studentId: mongoose.Types.ObjectId) => ({
      studentId,
      status: 'not_started',
    }));

    const assignment = await Assignment.create({
      title: title.trim(),
      flashcardSetId,
      classroomId,
      teacherId: session.user.id,
      studentIds,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      studentProgress,
    });

    return NextResponse.json({ assignment }, { status: 201 });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}
