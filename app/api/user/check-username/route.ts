import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';

const USERNAME_REGEX = /^[a-z0-9_-]{3,20}$/;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username query parameter is required' },
        { status: 400 }
      );
    }

    const normalizedUsername = username.toLowerCase().trim();

    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return NextResponse.json(
        {
          available: false,
          error:
            'Username must be 3-20 characters and can only contain lowercase letters, numbers, underscores, and hyphens',
        },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingUser = await User.findOne({ username: normalizedUsername }).lean();

    return NextResponse.json({ available: !existingUser });
  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json(
      { error: 'Failed to check username availability' },
      { status: 500 }
    );
  }
}
