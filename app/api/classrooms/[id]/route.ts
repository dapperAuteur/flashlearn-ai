/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Classroom } from '@/models/Classroom';

// GET - Get classroom details with student list
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
    const classroom = await Classroom.findById(id)
      .populate('students', 'name email')
      .populate('teacherId', 'name email')
      .lean();

    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    // Verify access: teacher, admin, or enrolled student
    const doc = classroom as any;
    const isTeacher = doc.teacherId?._id?.toString() === session.user.id;
    const isStudent = doc.students?.some(
      (s: any) => s._id?.toString() === session.user.id,
    );
    const isAdmin = session.user.role === 'Admin';

    if (!isTeacher && !isStudent && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ classroom });
  } catch (error) {
    console.error('Error fetching classroom:', error);
    return NextResponse.json({ error: 'Failed to fetch classroom' }, { status: 500 });
  }
}

// DELETE - Delete a classroom (teacher/admin only)
export async function DELETE(
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
    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    }

    const isOwner = classroom.teacherId.toString() === session.user.id;
    const isAdmin = session.user.role === 'Admin';

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Only the classroom teacher can delete it' }, { status: 403 });
    }

    await Classroom.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting classroom:', error);
    return NextResponse.json({ error: 'Failed to delete classroom' }, { status: 500 });
  }
}
