import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import { compare } from 'bcrypt';
import crypto from 'crypto';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { getConfirmEmailChangeTemplate } from '@/lib/email/templates/confirm-email-change';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY as string || '',
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { newEmail, password } = await request.json();

    if (!newEmail || !password) {
      return NextResponse.json(
        { error: 'New email and current password are required' },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get the current user with password
    const user = await User.findById(session.user.id).select('+password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    if (!user.password) {
      return NextResponse.json(
        { error: 'Password verification failed' },
        { status: 400 }
      );
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 }
      );
    }

    // Check if new email is the same as current
    const normalizedNewEmail = newEmail.toLowerCase().trim();
    if (normalizedNewEmail === user.email) {
      return NextResponse.json(
        { error: 'New email is the same as your current email' },
        { status: 400 }
      );
    }

    // Check if new email is already taken
    const existingUser = await User.findOne({ email: normalizedNewEmail });
    if (existingUser) {
      return NextResponse.json(
        { error: 'This email address is already in use' },
        { status: 409 }
      );
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Store pending email change on user doc
    user.pendingEmail = normalizedNewEmail;
    user.pendingEmailToken = hashedToken;
    user.pendingEmailExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Build confirmation URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const confirmUrl = `${baseUrl}/api/user/confirm-email-change?token=${token}`;

    // Send verification email to the new address
    const html = getConfirmEmailChangeTemplate({
      userName: user.name || 'there',
      newEmail: normalizedNewEmail,
      confirmUrl,
    });

    try {
      await mg.messages.create(process.env.MAILGUN_DOMAIN as string, {
        from: process.env.EMAIL_FROM || 'FlashLearn AI <noreply@witus.online>',
        to: normalizedNewEmail,
        subject: 'Confirm your new email address',
        html,
      });
    } catch (emailError) {
      console.error('Failed to send email change verification:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'A verification email has been sent to your new email address. Please check your inbox and click the confirmation link.',
    });
  } catch (error) {
    console.error('Error processing email change request:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
