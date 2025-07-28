import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongodb";
import { logAuthEvent } from "@/lib/logging/authLogger";
import { AuthEventType } from "@/models/AuthLog";
import { getErrorMessage } from "@/lib/utils/getErrorMessage";

export async function GET(request: NextRequest) {
  try {
    // Get token from query parameters
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    
    if (!token) {
      console.log("No verification token provided");

      // Log verification failure
      await logAuthEvent({
        request,
        event: AuthEventType.EMAIL_VERIFICATION_FAILURE,
        status: "failure",
        reason: "No token provided"
      });

      return NextResponse.redirect(new URL("/verification-error", request.url));
    }
    
    console.log("Processing verification token:", token);
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Find user with this token
    const user = await db.collection("users").findOne({
      verificationToken: token,
      verificationExpires: { $gt: new Date() } // Token must not be expired
    });
    
    if (!user) {
      console.log("Invalid or expired verification token");

      // Log verification failure
      await logAuthEvent({
        request,
        event: AuthEventType.EMAIL_VERIFICATION_FAILURE,
        status: "failure",
        reason: "Invalid or expired token"
      });

      return NextResponse.redirect(new URL("/verification-error", request.url));
    }
    
    // Update user to mark email as verified
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { emailVerified: true },
        $unset: { verificationToken: "", verificationExpires: "" }
      }
    );
    
    console.log("Email verified successfully for user:", user.email);

    // Log successful verification
    await logAuthEvent({
      request,
      event: AuthEventType.EMAIL_VERIFICATION,
      userId: user._id.toString(),
      email: user.email,
      status: "success"
    });
    
    // Redirect to success page
    return NextResponse.redirect(new URL("/signin?verified=true", request.url));
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error("Verification error:", errorMessage);

    // Log verification error
    await logAuthEvent({
      request,
      event: AuthEventType.EMAIL_VERIFICATION_FAILURE,
      status: "failure",
      reason: "Server error",
      metadata: { error: errorMessage }
    });
    
    return NextResponse.redirect(new URL("/verification-error", request.url));
  }
}