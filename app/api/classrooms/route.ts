import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import mongoose from 'mongoose';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Classroom } from '@/models/Classroom';

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// GET - List classrooms for the current teacher
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = session.user.role;
  const userId = new mongoose.Types.ObjectId(session.user.id);

  await dbConnect();

  let classrooms;
  if (role === 'Admin') {
    classrooms = await Classroom.find({}).populate('teacherId', 'name email').lean();
  } else if (['Teacher', 'Tutor', 'SchoolAdmin'].includes(role)) {
    classrooms = await Classroom.find({ teacherId: userId }).lean();
  } else {
    // Student/Parent — find classrooms they're enrolled in
    classrooms = await Classroom.find({ students: userId }).populate('teacherId', 'name email').lean();
  }

  return NextResponse.json({ classrooms });
}

// POST - Create a new classroom (teacher/admin only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allowedRoles = ['Teacher', 'Tutor', 'SchoolAdmin', 'Admin'];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Only teachers can create classrooms' }, { status: 403 });
  }

  try {
    const { name, schoolId } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Classroom name is required' }, { status: 400 });
    }

    await dbConnect();

    const classroom = await Classroom.create({
      name: name.trim(),
      teacherId: session.user.id,
      schoolId: schoolId || undefined,
      joinCode: generateJoinCode(),
      students: [],
    });

    return NextResponse.json({ classroom }, { status: 201 });
  } catch (error) {
    console.error('Error creating classroom:', error);
    return NextResponse.json({ error: 'Failed to create classroom' }, { status: 500 });
  }
}
