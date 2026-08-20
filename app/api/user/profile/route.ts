import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Logger, LogContext } from '@/lib/logging/logger';
import { getClientIp } from '@/lib/utils/utils';
import { softDeleteUserAccount, ACCOUNT_GRACE_PERIOD_DAYS } from '@/lib/api/purgeUserAccount';
import { User } from '@/models/User';

const PROFILE_FIELDS =
  'name email username profilePicture role subscriptionTier createdAt onboardingCompleted shareToOutboxOptIn';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id)
    .select(PROFILE_FIELDS)
    .lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();
  const body = await request.json();
  const { name, username } = body;

  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  if (name.trim().length > 100) {
    return NextResponse.json({ error: 'Name must be 100 characters or less' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { name: name.trim() };

  // Handle username update
  if (username !== undefined) {
    if (username === '' || username === null) {
      // Allow clearing username
      updateData.username = null;
    } else {
      const trimmed = username.trim().toLowerCase();
      if (trimmed.length < 3 || trimmed.length > 20) {
        return NextResponse.json({ error: 'Username must be between 3 and 20 characters' }, { status: 400 });
      }
      if (!/^[a-z0-9_-]+$/.test(trimmed)) {
        return NextResponse.json({ error: 'Username can only contain lowercase letters, numbers, underscores, and hyphens' }, { status: 400 });
      }
      // Check uniqueness (exclude current user)
      const existing = await User.findOne({ username: trimmed, _id: { $ne: session.user.id } });
      if (existing) {
        return NextResponse.json({ error: 'This username is already taken' }, { status: 409 });
      }
      updateData.username = trimmed;
    }
  }

  const user = await User.findByIdAndUpdate(
    session.user.id,
    updateData,
    { new: true, select: PROFILE_FIELDS }
  ).lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user, message: 'Profile updated successfully' });
}

// Narrow partial update. PATCH accepts the keys on PATCHABLE_BOOLEANS and
// nothing else. It is deliberately not a laxer PUT: a handler that copied the
// request body into the update would let anyone hand themselves `role: 'Admin'`
// or a paid `subscriptionTier`. Adding a field here means adding it to this
// list on purpose, with its own validation. The body is never spread.
const PATCHABLE_BOOLEANS = ['onboardingCompleted', 'shareToOutboxOptIn'] as const;

type PatchableBoolean = (typeof PATCHABLE_BOOLEANS)[number];

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be JSON' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  const source = body as Record<string, unknown>;
  const updateData: Partial<Record<PatchableBoolean, boolean>> = {};

  for (const key of PATCHABLE_BOOLEANS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (typeof source[key] !== 'boolean') {
      return NextResponse.json({ error: `${key} must be true or false` }, { status: 400 });
    }
    updateData[key] = source[key] as boolean;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: `This route updates ${PATCHABLE_BOOLEANS.join(' or ')}. Send at least one of them.` },
      { status: 400 },
    );
  }

  const user = await User.findByIdAndUpdate(
    session.user.id,
    updateData,
    { new: true, select: PROFILE_FIELDS },
  ).lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user, message: 'Profile updated successfully' });
}

// Account deletion, the right the privacy page already promises. The target is
// always the session user: no id is read from the body or the query string, so
// there is no way to aim this at somebody else.
//
// This route does NOT erase anything. It stamps the account for deletion and
// starts a grace period; /api/cron/purge-deleted-accounts does the
// irreversible part once the clock runs out. Signing in before then cancels
// the request and puts the account back. The one thing that happens right
// away is that the account's public sets go private, because an account that
// has asked to be gone should stop appearing in Explore immediately.
//
// The caller signs the user out on a 2xx. With a JWT session there is no
// server-side session to revoke, so the sign-out is the client's half of this.
//
// Admin accounts are refused. An Admin owns classrooms, verifies payments, and
// reviews content flags, and the last Admin deleting themselves would leave the
// instance with nobody who can administer it. The admin console already refuses
// to let an Admin delete an Admin, so this route matching that rule keeps one
// answer rather than two.
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const user = await User.findById(session.user.id)
      .select('role')
      .lean<{ role?: string } | null>();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role === 'Admin') {
      return NextResponse.json(
        { error: 'Admin accounts cannot be deleted here. Ask another admin to remove it.' },
        { status: 403 },
      );
    }

    const requestId = crypto.randomUUID();
    const result = await softDeleteUserAccount(session.user.id);

    if (!result) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    Logger.info(LogContext.USER, 'Account scheduled for deletion by owner', {
      requestId,
      requesterIp: getClientIp(request),
      purgeScheduledFor: result.purgeScheduledFor.toISOString(),
      hiddenSetCount: result.hiddenSetCount,
      alreadyScheduled: result.alreadyScheduled,
    });

    return NextResponse.json({
      message: `Your account is scheduled for deletion on ${result.purgeScheduledFor.toDateString()}. Sign in again before then to cancel it.`,
      deletedAt: result.deletedAt.toISOString(),
      purgeScheduledFor: result.purgeScheduledFor.toISOString(),
      gracePeriodDays: ACCOUNT_GRACE_PERIOD_DAYS,
      hiddenSetCount: result.hiddenSetCount,
    });
  } catch (error) {
    console.error('Error scheduling account deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
