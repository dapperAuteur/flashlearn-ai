import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import crypto from 'crypto';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { Team, MAX_EMAIL_INVITES_PER_TEAM } from '@/models/Team';
import { User } from '@/models/User';
import { Invitation } from '@/models/Invitation';
import { sendStudyGroupInviteEmail } from '@/lib/email/mailgun';
import { Logger, LogContext } from '@/lib/logging/logger';

interface Params {
  params: Promise<{ id: string }>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/teams/[id]/invite
// Body: { email: string }
// Sends a study-group invite email containing the join code.
// Capped at MAX_EMAIL_INVITES_PER_TEAM (3) per team. Caller must be a team admin.
export async function POST(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawEmail = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!rawEmail || !EMAIL_PATTERN.test(rawEmail) || rawEmail.length > 254) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }

  if (rawEmail === session.user.email?.toLowerCase()) {
    return NextResponse.json({ error: "You can't invite yourself." }, { status: 400 });
  }

  try {
    await dbConnect();

    const team = await Team.findById(id);
    if (!team) {
      return NextResponse.json({ error: 'Study group not found' }, { status: 404 });
    }

    const callerMembership = team.members.find(
      (m: { userId: { toString(): string }; role: string }) => m.userId.toString() === session.user.id,
    );
    if (!callerMembership || callerMembership.role !== 'admin') {
      return NextResponse.json({ error: 'Only group admins can send email invites.' }, { status: 403 });
    }

    if (team.emailInvitesUsed >= MAX_EMAIL_INVITES_PER_TEAM) {
      return NextResponse.json(
        {
          error: `You've used all ${MAX_EMAIL_INVITES_PER_TEAM} email invites for this group. Share the join code with anyone else.`,
        },
        { status: 409 },
      );
    }

    // If the email belongs to an existing user who is already a member, short-circuit.
    const existingUser = await User.findOne({ email: rawEmail }).select('_id').lean<{ _id: { toString(): string } }>();
    if (existingUser) {
      const alreadyMember = team.members.some(
        (m: { userId: { toString(): string } }) => m.userId.toString() === existingUser._id.toString(),
      );
      if (alreadyMember) {
        return NextResponse.json({ error: 'That person is already in this group.' }, { status: 409 });
      }
    }

    // Atomic increment to avoid race conditions on the counter.
    const updated = await Team.findOneAndUpdate(
      { _id: team._id, emailInvitesUsed: { $lt: MAX_EMAIL_INVITES_PER_TEAM } },
      { $inc: { emailInvitesUsed: 1 } },
      { new: true },
    );
    if (!updated) {
      return NextResponse.json(
        { error: `You've used all ${MAX_EMAIL_INVITES_PER_TEAM} email invites for this group.` },
        { status: 409 },
      );
    }

    const inviterName = session.user.name || session.user.email || 'A FlashLearnAI user';

    await Invitation.create({
      email: rawEmail,
      invitedBy: session.user.id,
      token: crypto.randomBytes(16).toString('hex'),
      status: 'sent',
      personalNote: `Invited to the "${team.name}" study group. Join code: ${team.joinCode}`,
      sentAt: new Date(),
    });

    const sendResult = await sendStudyGroupInviteEmail(rawEmail, inviterName, team.name, team.joinCode);
    if (!sendResult.success) {
      // Roll back the counter so the inviter is not charged for a failed send.
      await Team.findByIdAndUpdate(team._id, { $inc: { emailInvitesUsed: -1 } });
      Logger.error(LogContext.SYSTEM, 'Failed to send study group invite email', {
        teamId: id,
        email: rawEmail,
      });
      return NextResponse.json({ error: 'Could not send the invite email. Please try again.' }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      remainingInvites: MAX_EMAIL_INVITES_PER_TEAM - updated.emailInvitesUsed,
    });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error sending study group invite', { teamId: id, error });
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
