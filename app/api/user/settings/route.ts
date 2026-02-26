import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import { IUser } from '@/types/user';

const VALID_STUDY_DIRECTIONS = ['front-to-back', 'back-to-front'];
const VALID_STUDY_MODES = ['classic', 'multiple-choice', 'type-answer'];
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select('preferences')
    .lean() as IUser | null;

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Return preferences with defaults
  const preferences = {
    defaultStudyDirection: 'front-to-back' as const,
    defaultStudyMode: 'classic' as const,
    studyReminderEnabled: false,
    studyReminderTime: '09:00',
    ...user.preferences,
  };

  return NextResponse.json({ preferences });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const body = await request.json();
  const { defaultStudyDirection, defaultStudyMode, studyReminderEnabled, studyReminderTime } = body;

  // Validate fields if provided
  const update: Record<string, unknown> = {};

  if (defaultStudyDirection !== undefined) {
    if (!VALID_STUDY_DIRECTIONS.includes(defaultStudyDirection)) {
      return NextResponse.json({ error: 'Invalid study direction' }, { status: 400 });
    }
    update['preferences.defaultStudyDirection'] = defaultStudyDirection;
  }

  if (defaultStudyMode !== undefined) {
    if (!VALID_STUDY_MODES.includes(defaultStudyMode)) {
      return NextResponse.json({ error: 'Invalid study mode' }, { status: 400 });
    }
    update['preferences.defaultStudyMode'] = defaultStudyMode;
  }

  if (studyReminderEnabled !== undefined) {
    if (typeof studyReminderEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid reminder setting' }, { status: 400 });
    }
    update['preferences.studyReminderEnabled'] = studyReminderEnabled;
  }

  if (studyReminderTime !== undefined) {
    if (!TIME_REGEX.test(studyReminderTime)) {
      return NextResponse.json({ error: 'Invalid time format (use HH:MM)' }, { status: 400 });
    }
    update['preferences.studyReminderTime'] = studyReminderTime;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const user = await User.findByIdAndUpdate(
    session.user.id,
    { $set: update },
    { new: true, select: 'preferences' }
  ).lean() as IUser | null;

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    preferences: user.preferences,
    message: 'Settings updated successfully',
  });
}
