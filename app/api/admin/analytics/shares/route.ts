import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import clientPromise from "@/lib/db/mongodb";

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });

  if (!token || token.role !== "Admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("shareevents");

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      clicksByType,
      conversionsByType,
      utmBreakdown,
      topChallenges,
      timelineData,
    ] = await Promise.all([
      // Total clicks by type in last 30d
      col
        .aggregate([
          { $match: { clickedAt: { $gte: thirtyDaysAgo } } },
          { $group: { _id: "$type", clicks: { $sum: 1 } } },
        ])
        .toArray(),

      // Conversions (signups) by type in last 30d
      col
        .aggregate([
          {
            $match: {
              clickedAt: { $gte: thirtyDaysAgo },
              convertedUserId: { $ne: null },
            },
          },
          { $group: { _id: "$type", conversions: { $sum: 1 } } },
        ])
        .toArray(),

      // UTM source breakdown (all time for meaningful sample)
      col
        .aggregate([
          { $match: { clickedAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: "$utmSource",
              clicks: { $sum: 1 },
              conversions: {
                $sum: { $cond: [{ $ne: ["$convertedUserId", null] }, 1, 0] },
              },
            },
          },
          { $sort: { clicks: -1 } },
        ])
        .toArray(),

      // Top challenge codes by clicks (versus type only)
      col
        .aggregate([
          { $match: { type: "versus", clickedAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: "$resourceId",
              clicks: { $sum: 1 },
              conversions: {
                $sum: { $cond: [{ $ne: ["$convertedUserId", null] }, 1, 0] },
              },
            },
          },
          { $sort: { clicks: -1 } },
          { $limit: 10 },
        ])
        .toArray(),

      // 30-day timeline: clicks and conversions per day
      col
        .aggregate([
          { $match: { clickedAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$clickedAt" },
              },
              clicks: { $sum: 1 },
              conversions: {
                $sum: { $cond: [{ $ne: ["$convertedUserId", null] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray(),
    ]);

    // Normalize clicks by type
    const clicksMap: Record<string, number> = { versus: 0, results: 0, set: 0 };
    for (const row of clicksByType) {
      if (row._id) clicksMap[row._id as string] = row.clicks;
    }

    const conversionsMap: Record<string, number> = {
      versus: 0,
      results: 0,
      set: 0,
    };
    for (const row of conversionsByType) {
      if (row._id) conversionsMap[row._id as string] = row.conversions;
    }

    const totalClicks =
      clicksMap.versus + clicksMap.results + clicksMap.set;
    const totalConversions =
      conversionsMap.versus + conversionsMap.results + conversionsMap.set;
    const overallConversionRate =
      totalClicks > 0
        ? Math.round((totalConversions / totalClicks) * 1000) / 10
        : 0;

    // Top UTM platform by clicks
    const topPlatform = utmBreakdown[0]?._id ?? "—";

    return NextResponse.json({
      summary: {
        totalClicks,
        totalConversions,
        overallConversionRate,
        topPlatform,
      },
      clicksByType: clicksMap,
      conversionsByType: conversionsMap,
      utmBreakdown: utmBreakdown.map((row) => ({
        source: row._id || "direct",
        clicks: row.clicks,
        conversions: row.conversions,
        conversionRate:
          row.clicks > 0
            ? Math.round((row.conversions / row.clicks) * 1000) / 10
            : 0,
      })),
      topChallenges: topChallenges.map((row) => ({
        code: row._id,
        clicks: row.clicks,
        conversions: row.conversions,
      })),
      timelineData: timelineData.map((row) => ({
        date: row._id,
        clicks: row.clicks,
        conversions: row.conversions,
      })),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal Server Error: ${msg}` },
      { status: 500 }
    );
  }
}
