import { NextRequest, NextResponse } from "next/server";
import { User } from "@/models/User";
import { Logger, LogContext, LogLevel } from "@/lib/logging/logger";
import dbConnect from "@/lib/db/dbConnect";
import crypto from "crypto";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  const requestId = await Logger.info(LogContext.AUTH, "Password reset attempt initiated.");

  try {
    await dbConnect();

    const { token, password } = await request.json();

    if (!token || !password) {
      await Logger.warning(LogContext.AUTH, "Token and password are required for reset.", { requestId });
      return NextResponse.json({ error: "Token and new password are required." }, { status: 400 });
    }

    // Hash the token from the request to match the one stored in the DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find the user by the hashed token and ensure the token has not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      await Logger.warning(LogContext.AUTH, "Invalid or expired password reset token.", { requestId });
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    // Hash the new password and update the user document
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    await Logger.info(LogContext.AUTH,"Password has been successfully reset.",{
      level: LogLevel.INFO,
      userId: user._id.toString(),
      requestId,
    });

    return NextResponse.json({ message: "Password has been reset successfully." }, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await Logger.error(LogContext.AUTH, `Password reset failed: ${errorMessage}`, {
      requestId,
      metadata: { error },
    });
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
