import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { compare, hash } from 'bcrypt';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: 'Current password and new password are required' },
      { status: 400 }
    );
  }

  if (newPassword.length < 12) {
    return NextResponse.json(
      { error: 'New password must be at least 12 characters' },
      { status: 400 }
    );
  }

  const user = await User.findById(session.user.id).select('password');
  if (!user || !user.password) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const isCurrentValid = await compare(currentPassword, user.password);
  if (!isCurrentValid) {
    return NextResponse.json(
      { error: 'Current password is incorrect' },
      { status: 400 }
    );
  }

  const hashedPassword = await hash(newPassword, 12);
  await User.findByIdAndUpdate(session.user.id, { password: hashedPassword });

  return NextResponse.json({ message: 'Password updated successfully' });
}
