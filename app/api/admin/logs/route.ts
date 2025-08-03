/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/db/mongodb";
import { Logger, LogContext } from "@/lib/logging/logger";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });

  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const logType = searchParams.get("logType") || "all"; // 'system', 'auth', or 'all'
    const level = searchParams.get("level"); // 'info', 'warning', 'error'
    const context = searchParams.get("context");
    const userId = searchParams.get("userId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db();

    // Create the match stage based on query parameters. This will be reused.
    const matchStage: Record<string, any> = {};
    if (level) matchStage.level = level;
    if (context) matchStage.context = context;
    if (userId) matchStage.userId = userId;

    let logs = [];
    let totalLogs = 0;

    if (logType === 'system' || logType === 'auth') {
      const collectionName = logType === 'system' ? 'system_logs' : 'auth_logs';
      
      // Fetch the paginated logs
      logs = await db.collection(collectionName).aggregate([
          { $match: matchStage },
          { $sort: { timestamp: -1 } },
          { $skip: skip },
          { $limit: limit },
          { $addFields: { logSource: collectionName } }
      ]).toArray();
      
      // Get the total count for pagination
      totalLogs = await db.collection(collectionName).countDocuments(matchStage);

    } else { // logType === 'all'
      // This more advanced pipeline combines both collections, sorts, and paginates efficiently.
      const combinedLogsPipeline = [
          { $match: matchStage },
          { $addFields: { logSource: "system_logs" } }, // Tag with source
          { $unionWith: { 
              coll: "auth_logs", 
              pipeline: [ 
                  { $match: matchStage },
                  { $addFields: { logSource: "auth_logs" } }
              ]} 
          },
          { $sort: { timestamp: -1 } },
          { $skip: skip },
          { $limit: limit }
      ];
      
      logs = await db.collection("system_logs").aggregate(combinedLogsPipeline).toArray();

      // For counting, we count each collection with the filter and add them up.
      const systemCount = await db.collection("system_logs").countDocuments(matchStage);
      const authCount = await db.collection("auth_logs").countDocuments(matchStage);
      totalLogs = systemCount + authCount;
    }

    return NextResponse.json({
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLogs / limit),
        totalLogs,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await Logger.error(LogContext.SYSTEM, `Error fetching admin logs: ${errorMessage}`, {
      metadata: { error },
    });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
