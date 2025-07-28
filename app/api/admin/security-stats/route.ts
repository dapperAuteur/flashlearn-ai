/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/security-stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import clientPromise from "@/lib/db/mongodb";
import { AuthEventType } from "@/models/AuthLog";

/**
 * Get security statistics for admin dashboard
 * Restricted to admin users only
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin role
    const session = await getServerSession();
    
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }
    
    const client = await clientPromise;
    const db = client.db();
    
    // Get time periods for queries
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get counts of different events
    const [
      totalUsers,
      newUsers24h,
      totalLogins,
      loginCount24h,
      failedLogins24h,
      suspiciousActivity24h,
      suspiciousActivity7d
    ] = await Promise.all([
      // Total users
      db.collection("users").countDocuments(),
      
      // New users in last 24 hours
      db.collection("users").countDocuments({
        createdAt: { $gte: oneDayAgo }
      }),
      
      // Total login count
      db.collection("auth_logs").countDocuments({
        event: AuthEventType.LOGIN,
        status: "success"
      }),
      
      // Logins in last 24 hours
      db.collection("auth_logs").countDocuments({
        event: AuthEventType.LOGIN,
        status: "success",
        timestamp: { $gte: oneDayAgo }
      }),
      
      // Failed logins in last 24 hours
      db.collection("auth_logs").countDocuments({
        event: AuthEventType.LOGIN_FAILURE,
        timestamp: { $gte: oneDayAgo }
      }),
      
      // Suspicious activity in last 24 hours
      db.collection("auth_logs").countDocuments({
        event: AuthEventType.SUSPICIOUS_ACTIVITY,
        timestamp: { $gte: oneDayAgo }
      }),
      
      // Suspicious activity in last 7 days
      db.collection("auth_logs").countDocuments({
        event: AuthEventType.SUSPICIOUS_ACTIVITY,
        timestamp: { $gte: oneWeekAgo }
      })
    ]);
    
    // Get top IP addresses with failed logins
    const topSuspiciousIps = await db.collection("auth_logs")
      .aggregate([
        {
          $match: {
            event: AuthEventType.LOGIN_FAILURE,
            timestamp: { $gte: oneWeekAgo }
          }
        },
        {
          $group: {
            _id: "$ipAddress",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
      .toArray();
    
    return NextResponse.json({
      stats: {
        totalUsers,
        newUsers24h,
        totalLogins,
        loginCount24h,
        failedLogins24h,
        suspiciousActivity24h,
        suspiciousActivity7d,
        topSuspiciousIps: topSuspiciousIps.map(item => ({
          ipAddress: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error("Error fetching security stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}