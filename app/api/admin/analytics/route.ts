import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/db/mongodb";
import { Logger, LogContext } from "@/lib/logging/logger";
import { AuthEventType } from "@/models/AuthLog";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });

  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers24h,
      totalSuccessfulLogins,
      failedLogins24h,
      suspiciousActivity24h,
      subscriptionBreakdown,
      recentSignups,
    ] = await Promise.all([
      db.collection("users").countDocuments(),
      db.collection("users").countDocuments({ createdAt: { $gte: oneDayAgo } }),
      db.collection("auth_logs").countDocuments({ event: AuthEventType.LOGIN, status: "success" }),
      db.collection("auth_logs").countDocuments({ event: AuthEventType.LOGIN_FAILURE, timestamp: { $gte: oneDayAgo } }),
      db.collection("auth_logs").countDocuments({ event: AuthEventType.SUSPICIOUS_ACTIVITY, timestamp: { $gte: oneDayAgo } }),
      // Subscription tier breakdown
      db.collection("users").aggregate([
        { $group: { _id: "$subscriptionTier", count: { $sum: 1 } } },
      ]).toArray(),
      // Recent signups (last 7 days)
      db.collection("users")
        .find({ createdAt: { $gte: sevenDaysAgo } })
        .project({ name: 1, email: 1, createdAt: 1, subscriptionTier: 1 })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
    ]);

    // Build subscription stats
    const tierCounts: Record<string, number> = {
      Free: 0,
      'Monthly Pro': 0,
      'Annual Pro': 0,
      'Lifetime Learner': 0,
    };
    for (const entry of subscriptionBreakdown) {
      const tier = entry._id || 'Free';
      tierCounts[tier] = (tierCounts[tier] || 0) + entry.count;
    }

    const paidUsers = totalUsers - (tierCounts.Free || 0);

    return NextResponse.json({
      stats: {
        totalUsers,
        newUsers24h,
        totalLogins: totalSuccessfulLogins,
        failedLogins24h,
        suspiciousActivity24h,
        paidUsers,
        tierCounts,
      },
      recentSignups,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await Logger.error(LogContext.SYSTEM, `Error fetching admin analytics stats: ${errorMessage}`, {
      metadata: { error }
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
