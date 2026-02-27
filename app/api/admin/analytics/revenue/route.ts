import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import clientPromise from '@/lib/db/mongodb';
import { RevenueEvent } from '@/models/RevenueEvent';
import { User } from '@/models/User';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });

  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();
    const client = await clientPromise;
    const db = client.db();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    // -----------------------------------------------
    // 1. MRR Calculation from active User subscriptions
    // -----------------------------------------------
    const [monthlyCount, annualCount] = await Promise.all([
      User.countDocuments({ subscriptionTier: 'Monthly Pro' }),
      User.countDocuments({ subscriptionTier: 'Annual Pro' }),
    ]);

    const monthlyMrrCents = monthlyCount * 999;        // $9.99 each
    const annualMrrCents = annualCount * Math.round(9999 / 12); // $99.99 / 12 each
    const totalMrrCents = monthlyMrrCents + annualMrrCents;

    // -----------------------------------------------
    // 2. Active subscriptions by tier
    // -----------------------------------------------
    const tierBreakdown = await db.collection('users').aggregate([
      {
        $match: {
          subscriptionTier: { $in: ['Monthly Pro', 'Annual Pro', 'Lifetime Learner'] },
        },
      },
      {
        $group: {
          _id: '$subscriptionTier',
          count: { $sum: 1 },
        },
      },
    ]).toArray();

    const activeSubscriptions: Record<string, number> = {
      'Monthly Pro': 0,
      'Annual Pro': 0,
      'Lifetime Learner': 0,
    };
    let totalActiveSubscribers = 0;
    for (const entry of tierBreakdown) {
      activeSubscriptions[entry._id] = entry.count;
      totalActiveSubscribers += entry.count;
    }

    // -----------------------------------------------
    // 3. Churn rate (last 30 days)
    // -----------------------------------------------
    const canceledCount = await RevenueEvent.countDocuments({
      eventType: 'canceled',
      createdAt: { $gte: thirtyDaysAgo },
    });

    // Total active subscribers at start of period = current active + those who canceled in period
    const subscribersAtStart = totalActiveSubscribers + canceledCount;
    const churnRate = subscribersAtStart > 0
      ? Number(((canceledCount / subscribersAtStart) * 100).toFixed(2))
      : 0;

    // -----------------------------------------------
    // 4. Recent transactions (last 20)
    // -----------------------------------------------
    const recentTransactions = await RevenueEvent.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // -----------------------------------------------
    // 5. MRR trend (last 12 months)
    // -----------------------------------------------
    // We aggregate revenue events by month to compute an approximate running MRR.
    // For each month, we track net subscription changes to build a trend.
    const mrrTrendAgg = await db.collection('revenueevents').aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
          eventType: { $in: ['subscription_created', 'upgraded', 'downgraded', 'canceled'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          created: {
            $sum: { $cond: [{ $eq: ['$eventType', 'subscription_created'] }, 1, 0] },
          },
          upgraded: {
            $sum: { $cond: [{ $eq: ['$eventType', 'upgraded'] }, 1, 0] },
          },
          downgraded: {
            $sum: { $cond: [{ $eq: ['$eventType', 'downgraded'] }, 1, 0] },
          },
          canceled: {
            $sum: { $cond: [{ $eq: ['$eventType', 'canceled'] }, 1, 0] },
          },
          totalRevenueCents: {
            $sum: {
              $cond: [
                { $in: ['$eventType', ['subscription_created', 'upgraded']] },
                '$amountCents',
                0,
              ],
            },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]).toArray();

    // Build a 12-month MRR trend array
    const mrrTrend: { month: string; mrr: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-indexed
      const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });

      const monthData = mrrTrendAgg.find(
        (m) => m._id.year === year && m._id.month === month
      );

      // Use total revenue from events as an approximation of monthly revenue
      const mrrValue = monthData ? monthData.totalRevenueCents / 100 : 0;

      mrrTrend.push({ month: label, mrr: mrrValue });
    }

    // If we have current MRR data, use that for the current month
    if (mrrTrend.length > 0) {
      mrrTrend[mrrTrend.length - 1].mrr = totalMrrCents / 100;
    }

    // -----------------------------------------------
    // 6. Lifetime revenue (sum of all payment_succeeded events)
    // -----------------------------------------------
    const lifetimeRevenueAgg = await db.collection('revenueevents').aggregate([
      {
        $match: { eventType: 'payment_succeeded' },
      },
      {
        $group: {
          _id: null,
          totalCents: { $sum: '$amountCents' },
        },
      },
    ]).toArray();

    const lifetimeRevenueCents = lifetimeRevenueAgg.length > 0
      ? lifetimeRevenueAgg[0].totalCents
      : 0;

    return NextResponse.json({
      mrr: totalMrrCents / 100,
      activeSubscriptions,
      totalActiveSubscribers,
      churnRate,
      recentTransactions,
      mrrTrend,
      lifetimeRevenue: lifetimeRevenueCents / 100,
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
