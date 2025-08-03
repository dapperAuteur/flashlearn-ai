/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongodb";
import { generateVerificationToken } from "@/lib/tokens";
// import { sendEmail } from "@/lib/email/sendEmail";
// import { getVerificationEmailTemplate } from "@/lib/email/templates/verification";
import { getClientIp } from "@/lib/utils/utils";
import { rateLimitRequest } from "@/lib/ratelimit/rateLimitAPI";
import { sendVerificationEmail } from "@/lib/email/mailgun";

export async function POST(request: NextRequest) {

  // Get client IP for rate limiting
  const ip = getClientIp(request);

  // Apply rate limiting (3 resend attempts per 10 minutes)
  const rateLimitResult = await rateLimitRequest(ip, "resend-verification", 3, 600);
  
  // If rate limit exceeded, return 429 Too Many Requests
  if (!rateLimitResult.success) {
    console.log(`Rate limit exceeded for IP ${ip} on resend verification endpoint`);
    return NextResponse.json(
      { 
        error: "Too many verification requests. Please try again later.", 
        retryAfter: rateLimitResult.reset 
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
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    console.log("Resending verification email to:", email);
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Find the user
    const user = await db.collection("users").findOne({ email });
    
    if (!user) {
      // Don't reveal that the user doesn't exist
      return NextResponse.json(
        { message: "If your email exists in our system, we've sent a verification link" },
        { status: 200 }
      );
    }
    
    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
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
    
    console.log("Verification email resent to:", email);
    
    return NextResponse.json(
      { message: "Verification email sent successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}