/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongodb";
import { generateVerificationToken } from "@/lib/tokens";
import { getClientIp } from "@/lib/utils/utils";
import { getRateLimiter } from "@/lib/ratelimit/rateLimitAPI"; // Corrected import
import { sendVerificationEmail } from "@/lib/email/mailgun";
import { Logger, LogContext } from "@/lib/logging/logger";
import { logAuthEvent } from "@/lib/logging/authLogger";
import { AuthEventType } from "@/models/AuthLog";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request) ?? "127.0.0.1";

  // Apply rate limiting (3 resend attempts per 10 minutes)
  const limiter = getRateLimiter("resend-verification", 3, 600);
  const rateLimitResult = await limiter.limit(ip);
  
  // If rate limit exceeded, return 429 Too Many Requests
  if (!rateLimitResult.success) {
    await Logger.warning(LogContext.AUTH, "Rate limit exceeded for resend verification", { ip });
    return NextResponse.json(
      { 
        error: "Too many verification requests. Please try again later.", 
      },
      { 
        status: 429,
        headers: {
          "Retry-After": rateLimitResult.reset.toString(),
        }
      }
    );
  }

  try {
    const { email } = await request.json();
    
    if (!email) {
      await logAuthEvent({
        request,
        event: AuthEventType.VERIFY_EMAIL_FAILURE,
        status: "failure",
        reason: "Email not provided in request body"
      });
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    await Logger.info(LogContext.AUTH, "Resend verification email attempt.", { email, ip });
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Find the user
    const user = await db.collection("users").findOne({ email });
    
    if (!user) {
      // Security: Don't reveal that the user doesn't exist.
      // Log the attempt but return a generic success message.
      await Logger.info(LogContext.AUTH, "Resend verification requested for non-existent user.", { email, ip });
      return NextResponse.json(
        { message: "If your email exists in our system, we have sent a new verification link." },
        { status: 200 }
      );
    }
    
    // Check if email is already verified
    if (user.emailVerified) {
      await logAuthEvent({
        request,
        event: AuthEventType.VERIFY_EMAIL_FAILURE,
        userId: user._id.toString(),
        email,
        status: "failure",
        reason: "Email is already verified"
      });
      return NextResponse.json(
        { error: "This email address has already been verified." },
        { status: 400 }
      );
    }
    
    // Generate new verification token and expiry
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Update user with new token
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          verificationToken,
          verificationExpires,
          updatedAt: new Date()
        }
      }
    );

    // Send verification email
    await sendVerificationEmail(user.email, user.name, verificationToken);
    
    await logAuthEvent({
        request,
        event: AuthEventType.VERIFY_EMAIL,
        userId: user._id.toString(),
        email,
        status: "success",
        reason: "Verification email resent"
      });
    
    return NextResponse.json(
      { message: "A new verification email has been sent successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    await Logger.error(LogContext.AUTH, "Server error during resend verification", { error: error.message, stack: error.stack });
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
