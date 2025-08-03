import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/db/mongodb";
import { Logger, LogContext } from "@/lib/logging/logger";
import { AuthEventType } from "@/models/AuthLog";

const secret = process.env.NEXTAUTH_SECRET;

/**
 * Get key analytics and security statistics for the admin dashboard.
 * Restricted to admin users only.
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });

  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Perform all database queries in parallel for efficiency
    const [
      totalUsers,
      newUsers24h,
      totalSuccessfulLogins,
      failedLogins24h,
      suspiciousActivity24h
    ] = await Promise.all([
      // 1. Total users
      db.collection("users").countDocuments(),
      
      // 2. New users in the last 24 hours
      db.collection("users").countDocuments({ createdAt: { $gte: oneDayAgo } }),
      
      // 3. Total successful logins ever
      db.collection("auth_logs").countDocuments({ event: AuthEventType.LOGIN, status: "success" }),
      
      // 4. Failed logins in the last 24 hours
      db.collection("auth_logs").countDocuments({ event: AuthEventType.LOGIN_FAILURE, timestamp: { $gte: oneDayAgo } }),
      
      // 5. Suspicious activity events in the last 24 hours
      db.collection("auth_logs").countDocuments({ event: AuthEventType.SUSPICIOUS_ACTIVITY, timestamp: { $gte: oneDayAgo } })
    ]);
    
    const stats = {
      totalUsers,
      newUsers24h,
      totalLogins: totalSuccessfulLogins, // Renamed for clarity on the frontend
      failedLogins24h,
      suspiciousActivity24h,
    };

    return NextResponse.json({ stats });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await Logger.error(LogContext.SYSTEM, `Error fetching admin analytics stats: ${errorMessage}`, {
      metadata: { error }
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
