import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import dbConnect from '@/lib/db/dbConnect';
import { Invitation } from '@/models/Invitation';
import { User } from '@/models/User';
import { Logger, LogContext } from '@/lib/logging/logger';
import { getInvitationEmailTemplate } from '@/lib/email/templates/invitation';

const secret = process.env.NEXTAUTH_SECRET;

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY as string || '',
});

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status');

    const filter: Record<string, string> = {};
    if (status && ['sent', 'accepted', 'expired'].includes(status)) {
      filter.status = status;
    }

    const total = await Invitation.countDocuments(filter);
    const invitations = await Invitation.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      invitations,
      pagination: { page, limit, total },
    });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Error fetching invitations', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { email, personalNote } = await request.json();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    await dbConnect();

    // Check if email already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered' },
        { status: 409 }
      );
    }

    // Check if already invited with status 'sent'
    const existingInvitation = await Invitation.findOne({
      email: email.toLowerCase(),
      status: 'sent',
    });
    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 409 }
      );
    }

    // Generate token
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Create invitation
    const invitation = await Invitation.create({
      email: email.toLowerCase(),
      invitedBy: token.id,
      token: inviteToken,
      status: 'sent',
      personalNote: personalNote || undefined,
      sentAt: new Date(),
    });

    // Build signup URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const signupUrl = `${baseUrl}/auth/signup?invite=${inviteToken}`;

    // Get inviter name for the email template
    const inviter = await User.findById(token.id).select('name').lean();
    const inviterName = (inviter as { name?: string })?.name || 'A FlashLearn AI admin';

    // Generate email HTML
    const html = getInvitationEmailTemplate({
      inviterName,
      personalNote,
      signupUrl,
    });

    // Validate email configuration before sending
    if (!process.env.MAILGUN_API_KEY) {
      Logger.error(LogContext.SYSTEM, 'MAILGUN_API_KEY is not configured');
      return NextResponse.json({ error: 'Email service is not configured (missing API key)' }, { status: 503 });
    }
    if (!process.env.MAILGUN_DOMAIN) {
      Logger.error(LogContext.SYSTEM, 'MAILGUN_DOMAIN is not configured');
      return NextResponse.json({ error: 'Email service is not configured (missing domain)' }, { status: 503 });
    }

    // Send email via Mailgun
    try {
      await mg.messages.create(process.env.MAILGUN_DOMAIN, {
        from: process.env.EMAIL_FROM || 'FlashLearn AI <noreply@witus.online>',
        to: email.toLowerCase(),
        subject: `${inviterName} has invited you to FlashLearn AI`,
        html,
      });
    } catch (emailError) {
      const emailMsg = emailError instanceof Error ? emailError.message : String(emailError);
      Logger.error(LogContext.SYSTEM, `Failed to send invitation email: ${emailMsg}`, {
        adminId: token.id,
        email,
      });
      // Clean up the invitation record since email failed
      await Invitation.findByIdAndDelete(invitation._id).catch(() => {});
      return NextResponse.json({ error: `Failed to send email: ${emailMsg}` }, { status: 502 });
    }

    Logger.info(LogContext.SYSTEM, `Invitation sent to ${email}`, {
      adminId: token.id,
      invitationId: String(invitation._id),
    });

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    Logger.error(LogContext.SYSTEM, `Error sending invitation: ${msg}`, { error });
    return NextResponse.json({ error: `Failed to send invitation: ${msg}` }, { status: 500 });
  }
}
