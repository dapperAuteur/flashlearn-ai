import { NextRequest, NextResponse } from "next/server";
import { User } from "@/models/User";
import formData from "form-data";
import Mailgun from "mailgun.js";
import { Logger, LogContext, LogLevel } from "@/lib/logging/logger";
import dbConnect from "@/lib/db/dbConnect";
import crypto from "crypto";
import { getPasswordResetEmailTemplate } from "@/lib/email/templates/password-reset";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY as string || "",
});

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
    const user = await User.findOneAndUpdate(
      { email: email },
      {
        $set: {
          resetPasswordToken: passwordResetToken,
          resetPasswordExpires: passwordResetExpires,
        },
      },
      { new: false }
    );

    // Security: Always return a success response to prevent email enumeration.
    if (user) {
      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

      // Validate email configuration before sending
      if (!process.env.MAILGUN_API_KEY) {
        Logger.error(LogContext.SYSTEM, "MAILGUN_API_KEY is not configured");
        return NextResponse.json({
          message: "If an account with that email exists, a password reset link has been sent.",
        }, { status: 200 });
      }
      if (!process.env.MAILGUN_DOMAIN) {
        Logger.error(LogContext.SYSTEM, "MAILGUN_DOMAIN is not configured");
        return NextResponse.json({
          message: "If an account with that email exists, a password reset link has been sent.",
        }, { status: 200 });
      }

      const html = getPasswordResetEmailTemplate({
        userName: user.name || "there",
        resetUrl,
      });

      try {
        await mg.messages.create(process.env.MAILGUN_DOMAIN, {
          from: process.env.EMAIL_FROM || "FlashLearn AI <noreply@flashlearn.ai>",
          to: user.email,
          subject: "Your FlashLearn AI Password Reset Request",
          html,
        });

        await Logger.info(LogContext.AUTH, `Password reset email sent successfully to ${email}`, {
          level: LogLevel.INFO,
          userId: user._id.toString(),
          requestId,
        });
      } catch (emailError) {
        const emailMsg = emailError instanceof Error ? emailError.message : String(emailError);
        Logger.error(LogContext.AUTH, `Failed to send password reset email: ${emailMsg}`, {
          userId: user._id.toString(),
          requestId,
        });
      }
    } else {
      await Logger.info(LogContext.AUTH, `Password reset requested for non-existent email: ${email}`, {
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
