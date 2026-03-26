import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import { Profile } from '@/models/Profile';
import { Logger, LogContext } from '@/lib/logging/logger';

const secret = process.env.NEXTAUTH_SECRET;

const VALID_ROLES = ['Student', 'Teacher', 'Tutor', 'Parent', 'SchoolAdmin', 'Admin'];
const VALID_TIERS = ['Free', 'Monthly Pro', 'Annual Pro', 'Lifetime Learner'];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { role, subscriptionTier, suspended, emailVerified } = body;

    await dbConnect();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent admin from demoting themselves
    if (role && id === token.id && role !== 'Admin') {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 },
      );
    }

    if (role) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      user.role = role;
    }

    if (subscriptionTier) {
      if (!VALID_TIERS.includes(subscriptionTier)) {
        return NextResponse.json({ error: 'Invalid subscription tier' }, { status: 400 });
      }
      user.subscriptionTier = subscriptionTier;
    }

    if (typeof suspended === 'boolean') {
      user.suspended = suspended;
    }

    if (typeof emailVerified === 'boolean') {
      user.emailVerified = emailVerified;
    }

    await user.save();

    Logger.info(LogContext.SYSTEM, `Admin updated user ${id}`, {
      adminId: token.id,
      changes: { role, subscriptionTier, suspended, emailVerified },
    });

    return NextResponse.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      },
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;

  // Prevent admin from deleting themselves
  if (id === token.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  try {
    await dbConnect();
    const user = await User.findById(id).select('name email role') as { _id: string; name: string; email: string; role: string } | null;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting other admins
    if (user.role === 'Admin') {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 400 });
    }

    // Delete user and their profile
    await Promise.all([
      User.findByIdAndDelete(id),
      Profile.deleteMany({ user: id }),
    ]);

    Logger.info(LogContext.SYSTEM, `Admin deleted user ${id}`, {
      adminId: token.id,
      deletedUser: { name: user.name, email: user.email },
    });

    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
