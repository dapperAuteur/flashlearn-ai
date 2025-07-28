/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { 
  getUserAuthLogs, 
  getRecentFailedLogins, 
  getSuspiciousActivityLogs 
} from "@/lib/logging/authLogger";
import clientPromise from "@/lib/db/mongodb";

/**
 * Get authentication logs
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
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "all";
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    
    let logs;
    
    if (userId) {
      // Get logs for a specific user
      logs = await getUserAuthLogs(userId, limit);
    } else {
      // Get logs based on type
      switch (type) {
        case "failed_logins":
          logs = await getRecentFailedLogins(limit);
          break;
        case "suspicious":
          logs = await getSuspiciousActivityLogs(limit);
          break;
        default:
          // Get all logs (implement this as needed)
          const client = await clientPromise;
          const db = client.db();
          logs = await db
            .collection("auth_logs")
            .find()
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
          break;
      }
    }
    
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching auth logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}