import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import crypto from 'crypto';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { getLoginCodeEmailTemplate } from '@/lib/email/templates/login-code';
import { getRateLimiter } from '@/lib/ratelimit/ratelimit';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY as string || '',
});

// Rate limiter: 3 requests per 10 minutes per email
const loginCodeLimiter = getRateLimiter('send-login-code', 3, 600);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limit by email
    const { success: rateLimitOk } = await loginCodeLimiter.limit(normalizedEmail);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    await dbConnect();

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });

    // Security: Always return the same success response to prevent email enumeration
    const successResponse = NextResponse.json({
      message: 'If an account with that email exists, a login code has been sent.',
    });

    if (!user) {
      return successResponse;
    }

    // Check if user is suspended
    if (user.suspended) {
      return successResponse;
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return successResponse;
    }

    // Generate 6-digit numeric code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the code for storage
    const hashedCode = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');

    // Store hashed code, expiration (10 minutes), and reset attempts
    user.loginCode = hashedCode;
    user.loginCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    user.loginCodeAttempts = 0;
    await user.save();

    // Send code via email
    const html = getLoginCodeEmailTemplate({ code });

    try {
      await mg.messages.create(process.env.MAILGUN_DOMAIN as string, {
        from: process.env.EMAIL_FROM || 'FlashLearn AI <noreply@flashlearn.ai>',
        to: normalizedEmail,
        subject: 'Your FlashLearn login code',
        html,
      });
    } catch (emailError) {
      console.error('Failed to send login code email:', emailError);
      // Still return the generic success response for security
      return successResponse;
    }

    return successResponse;
  } catch (error) {
    console.error('Error sending login code:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 }
    );
  }
}
