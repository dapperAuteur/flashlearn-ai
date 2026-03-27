import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import clientPromise from "@/lib/db/mongodb";

const secret = process.env.NEXTAUTH_SECRET;
const FOUNDERS_CAP = 100;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });

  if (!token || token.role !== "Admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const [stripePaid, cashAppVerified, totalLifetime, lifetimeByMonth] =
      await Promise.all([
        // Paid via Stripe (has stripeCustomerId)
        db.collection("users").countDocuments({
          subscriptionTier: "Lifetime Learner",
          stripeCustomerId: { $exists: true, $ne: null },
        }),
        // Paid via CashApp (verified payments)
        db
          .collection("cashapppayments")
          .countDocuments({ status: "verified" }),
        // Total lifetime (all sources including manual/gifted)
        db
          .collection("users")
          .countDocuments({ subscriptionTier: "Lifetime Learner" }),
        // Monthly breakdown using createdAt as fallback
        db
          .collection("users")
          .aggregate([
            {
              $match: {
                subscriptionTier: "Lifetime Learner",
                $or: [
                  { stripeCustomerId: { $exists: true, $ne: null } },
                ],
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: "$createdAt" },
                  month: { $month: "$createdAt" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { "_id.year": -1, "_id.month": -1 } },
            { $limit: 12 },
          ])
          .toArray(),
      ]);

    const totalPaid = stripePaid + cashAppVerified;
    const totalGifted = Math.max(0, totalLifetime - totalPaid);
    const remaining = Math.max(0, FOUNDERS_CAP - totalPaid);

    return NextResponse.json({
      totalPaid,
      totalGifted,
      totalLifetime,
      stripePaid,
      cashAppVerified,
      remaining,
      cap: FOUNDERS_CAP,
      active: remaining > 0,
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
