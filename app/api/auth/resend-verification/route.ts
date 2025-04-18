// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import clientPromise from "@/lib/db/mongodb";
import { sendVerificationEmail } from "@/lib/email/mailgun";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }
    
    const client = await clientPromise;
    const db = client.db();
    
    // Find user by email
    const user = await db.collection("users").findOne({ email });
    
    if (!user) {
      // Don't reveal that the user doesn't exist for security
      return NextResponse.json(
        { message: "If an account exists, a verification email has been sent." },
        { status: 200 }
      );
    }
    
    // If user is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified. You can log in." },
        { status: 200 }
      );
    }
    
    // Generate new verification token
    const verificationToken = randomBytes(32).toString("hex");
    const verificationTokenExpires = new Date();
    verificationTokenExpires.setHours(verificationTokenExpires.getHours() + 24); // 24 hour expiry
    
    // Update user with new token
    await db.collection("users").updateOne(
      { _id: user._id },
      { 
        $set: { 
          verificationToken,
          verificationTokenExpires
        }
      }
    );
    
    // Send verification email
    await sendVerificationEmail(user.email, user.name, verificationToken);
    
    return NextResponse.json(
      { message: "Verification email has been sent. Please check your inbox." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}