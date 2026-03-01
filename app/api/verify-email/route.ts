import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongodb";
import { logAuthEvent } from "@/lib/logging/authLogger";
import { AuthEventType } from "@/models/AuthLog";
import { getErrorMessage } from "@/lib/utils/getErrorMessage";
import { Logger, LogContext } from "@/lib/logging/logger";

export async function GET(request: NextRequest) {
  try {
    // Get token from query parameters
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    
    if (!token) {
      await logAuthEvent({
        request,
        event: AuthEventType.VERIFY_EMAIL_FAILURE, // Corrected from EMAIL_VERIFICATION_FAILURE
        status: "failure",
        reason: "No token provided in verification link"
      });

      // Redirect to a user-friendly error page
      return NextResponse.redirect(new URL("/verification-error?reason=no-token", request.url));
    }
    
    await Logger.info(LogContext.AUTH, "Processing email verification token.", { token });
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Find user with this token that has not expired (support both field names)
    const user = await db.collection("users").findOne({
      verificationToken: token,
      $or: [
        { verificationTokenExpires: { $gt: new Date() } },
        { verificationExpires: { $gt: new Date() } },
      ],
    });

    if (!user) {
      await logAuthEvent({
        request,
        event: AuthEventType.VERIFY_EMAIL_FAILURE, // Corrected from EMAIL_VERIFICATION_FAILURE
        status: "failure",
        reason: "Invalid or expired token"
      });

      return NextResponse.redirect(new URL("/verification-error?reason=invalid-token", request.url));
    }
    
    // Update user to mark email as verified and remove token details
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { emailVerified: true, updatedAt: new Date() },
        $unset: { verificationToken: "", verificationExpires: "", verificationTokenExpires: "" }
      }
    );
    
    await logAuthEvent({
      request,
      event: AuthEventType.VERIFY_EMAIL, // Corrected from EMAIL_VERIFICATION
      userId: user._id.toString(),
      email: user.email,
      status: "success"
    });
    
    // Redirect to the sign-in page with a success message
    return NextResponse.redirect(new URL("/auth/signin?verified=true", request.url));

  } catch (error) {
    const errorMessage = getErrorMessage(error);
    await Logger.error(LogContext.AUTH, "Server error during email verification.", { error: errorMessage });

    await logAuthEvent({
      request,
      event: AuthEventType.VERIFY_EMAIL_FAILURE, // Corrected from EMAIL_VERIFICATION_FAILURE
      status: "failure",
      reason: "Server error during verification",
      metadata: { error: errorMessage }
    });
    
    // Redirect to a generic error page
    return NextResponse.redirect(new URL("/verification-error?reason=server-error", request.url));
  }
}
