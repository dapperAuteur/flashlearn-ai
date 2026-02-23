import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Classroom } from '@/models/Classroom';

// POST - Join a classroom using a join code
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { joinCode } = await request.json();
    if (!joinCode?.trim()) {
      return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
    }

    await dbConnect();

    const classroom = await Classroom.findOne({ joinCode: joinCode.trim().toUpperCase() });
    if (!classroom) {
      return NextResponse.json({ error: 'Invalid join code' }, { status: 404 });
    }

    // Check if already enrolled
    const alreadyEnrolled = classroom.students.some(
      (s: { toString: () => string }) => s.toString() === session.user.id,
    );
    if (alreadyEnrolled) {
      return NextResponse.json({ error: 'Already enrolled in this classroom' }, { status: 400 });
    }

    classroom.students.push(session.user.id);
    await classroom.save();

    return NextResponse.json({
      classroom: {
        _id: classroom._id,
        name: classroom.name,
        joinCode: classroom.joinCode,
      },
    });
  } catch (error) {
    console.error('Error joining classroom:', error);
    return NextResponse.json({ error: 'Failed to join classroom' }, { status: 500 });
  }
}
