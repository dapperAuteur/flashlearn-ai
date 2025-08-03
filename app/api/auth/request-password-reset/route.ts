import { NextRequest, NextResponse } from "next/server";
import { User } from "@/models/User";
import { Resend } from "resend";
import { Logger, LogContext, LogLevel } from "@/lib/logging/logger";
import dbConnect from "@/lib/db/dbConnect";
import crypto from "crypto";
import PasswordResetEmail from "@/emails/PasswordResetEmail";

// Ensure the RESEND_API_KEY is available
if (!process.env.RESEND_API_KEY) {
  Logger.error(LogContext.SYSTEM, "RESEND_API_KEY is not set in environment variables.");
}
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const requestId = await Logger.info(LogContext.AUTH, "Password reset request initiated.");

  try {
    await dbConnect();

    const { email } = await request.json();

    if (!email) {
      await Logger.warning(LogContext.AUTH, "Email is required for password reset.", { requestId });
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Generate a secure token *before* the database call
    const resetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Set token expiration to 1 hour from now
    const passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Use findOneAndUpdate to find the user and atomically set the reset token and expiration.
    // This is a single, reliable database operation.
    const user = await User.findOneAndUpdate(
      { email: email }, // Find the user by their email
      {
        $set: { // Set the new values
          resetPasswordToken: passwordResetToken,
          resetPasswordExpires: passwordResetExpires,
        },
      },
      { new: false } // We don't need the updated document back, so `new: false` is fine.
    );

    // Security: Always return a success response to prevent email enumeration.
    // The email sending logic only runs if the findOneAndUpdate operation found and updated a user.
    if (user) {

      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

      // Send the password reset email using Resend
      await resend.emails.send({
        from: "FlashLearn AI <noreply@witus.online>", // IMPORTANT: Replace with your verified Resend domain
        to: user.email,
        subject: "Your FlashLearn AI Password Reset Request",
        react: PasswordResetEmail({
          userFirstname: user.name,
          resetPasswordUrl: resetUrl,
        }),
      });

      await Logger.info(LogContext.AUTH, `Password reset email sent successfully to ${email}`,{
        level: LogLevel.INFO,
        userId: user._id.toString(),
        requestId,
      });
    } else {
        await Logger.info(LogContext.AUTH, `Password reset requested for non-existent email: ${email}`,{
            requestId,
        });
    }

    return NextResponse.json({
      message: "If an account with that email exists, a password reset link has been sent.",
    }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await Logger.error(LogContext.AUTH, `Password reset request failed: ${errorMessage}`, {
      requestId,
      metadata: { error },
    });
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
