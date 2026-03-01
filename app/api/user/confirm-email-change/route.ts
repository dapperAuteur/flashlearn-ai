import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { User } from '@/models/User';
import crypto from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      return NextResponse.redirect(
        `${baseUrl}/profile?emailChangeError=missing_token`
      );
    }

    // Hash the provided token with SHA-256
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    await dbConnect();

    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      pendingEmailToken: hashedToken,
      pendingEmailExpires: { $gt: new Date() },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    if (!user) {
      return NextResponse.redirect(
        `${baseUrl}/profile?emailChangeError=invalid_or_expired`
      );
    }

    // Check if the pending email is already taken (could have been taken between request and confirmation)
    const existingUser = await User.findOne({ email: user.pendingEmail });
    if (existingUser) {
      // Clear pending fields since this email is no longer available
      user.pendingEmail = undefined;
      user.pendingEmailToken = undefined;
      user.pendingEmailExpires = undefined;
      await user.save();

      return NextResponse.redirect(
        `${baseUrl}/profile?emailChangeError=email_taken`
      );
    }

    // Update the email to the pending email
    user.email = user.pendingEmail;
    user.emailVerified = true;

    // Clear pending email fields
    user.pendingEmail = undefined;
    user.pendingEmailToken = undefined;
    user.pendingEmailExpires = undefined;

    await user.save();

    return NextResponse.redirect(`${baseUrl}/profile?emailChanged=true`);
  } catch (error) {
    console.error('Error confirming email change:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/profile?emailChangeError=server_error`
    );
  }
}
