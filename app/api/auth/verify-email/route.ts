import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongodb";
import { sendWelcomeEmail } from "@/lib/email/mailgun";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    
    if (!token) {
      return NextResponse.redirect(new URL("/auth/error?error=missing_token", request.url));
    }
    
    const client = await clientPromise;
    const db = client.db();
    
    // Find user with matching token that hasn't expired
    const user = await db.collection("users").findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: new Date() }
    });
    
    if (!user) {
      return NextResponse.redirect(new URL("/auth/error?error=invalid_token", request.url));
    }
    
    // Update user as verified and remove token
    await db.collection("users").updateOne(
      { _id: user._id },
      { 
        $set: { emailVerified: true },
        $unset: { verificationToken: "", verificationTokenExpires: "" }
      }
    );
    
    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);
    
    // Redirect to success page
    return NextResponse.redirect(new URL("/auth/verified", request.url));
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(new URL("/auth/error?error=server_error", request.url));
  }
}