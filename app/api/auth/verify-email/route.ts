import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db/mongodb";
import { sendWelcomeEmail } from "@/lib/email/mailgun";
import { VERIFIED_NOTICE_COOKIE } from "@/lib/auth/verified-notice";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    
    if (!token) {
      return NextResponse.redirect(new URL("/error?error=missing_token", request.url));
    }
    
    const client = await clientPromise;
    const db = client.db();
    
    // Find user with matching token that hasn't expired
    // Support both field names for backwards compatibility
    const user = await db.collection("users").findOne({
      verificationToken: token,
      $or: [
        { verificationTokenExpires: { $gt: new Date() } },
        { verificationExpires: { $gt: new Date() } },
      ],
    });

    if (!user) {
      return NextResponse.redirect(new URL("/error?error=invalid_token", request.url));
    }

    // Update user as verified and remove token (clear both field name variants)
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { emailVerified: true },
        $unset: { verificationToken: "", verificationTokenExpires: "", verificationExpires: "" }
      }
    );
    
    // Send welcome email
    await sendWelcomeEmail(user.email, user.name);
    
    // Redirect to the success page with a short-lived notice cookie. /verified shows its "Email
    // Verified!" message ONLY when this cookie is present; a direct visit (no cookie) is sent to
    // sign-in instead of being told something that did not happen. The page stays reachable signed
    // out on purpose: people verify from their inbox before they have signed in, often in another
    // browser. Scoped to /verified and httpOnly, so it carries no identity and nothing reads it.
    const response = NextResponse.redirect(new URL("/verified", request.url));
    response.cookies.set(VERIFIED_NOTICE_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/verified",
      maxAge: 120,
    });
    return response;
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.redirect(new URL("/error?error=server_error", request.url));
  }
}