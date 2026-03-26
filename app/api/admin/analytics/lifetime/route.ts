import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
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
    const users = db.collection("users");

    const [totalLifetime, lifetimeByMonth] = await Promise.all([
      users.countDocuments({ subscriptionTier: "Lifetime Learner" }),
      users
        .aggregate([
          { $match: { subscriptionTier: "Lifetime Learner" } },
          {
            $group: {
              _id: {
                year: { $year: "$subscriptionStartDate" },
                month: { $month: "$subscriptionStartDate" },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": -1, "_id.month": -1 } },
          { $limit: 12 },
        ])
        .toArray(),
    ]);

    const remaining = Math.max(0, 100 - totalLifetime);

    return NextResponse.json({
      totalLifetime,
      remaining,
      cap: 100,
      byMonth: lifetimeByMonth.map((m) => ({
        month: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
        count: m.count,
      })),
    });
  } catch (error) {
    console.error("[admin/analytics/lifetime] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
