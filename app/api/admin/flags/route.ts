import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { ContentFlag } from '@/models/ContentFlag';

const secret = process.env.NEXTAUTH_SECRET;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const status = searchParams.get('status') || '';

    // Build filter
    const filter: Record<string, unknown> = {};
    if (status && ['pending', 'reviewed', 'dismissed', 'action-taken'].includes(status)) {
      filter.status = status;
    }

    // Get flags with pagination
    const skip = (page - 1) * limit;
    const [flags, total] = await Promise.all([
      ContentFlag.find(filter)
        .populate('setId', 'title isPublic')
        .populate('reportedBy', 'name email')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContentFlag.countDocuments(filter),
    ]);

    // Get counts by status for tab badges
    const [pendingCount, reviewedCount, dismissedCount, actionTakenCount] = await Promise.all([
      ContentFlag.countDocuments({ status: 'pending' }),
      ContentFlag.countDocuments({ status: 'reviewed' }),
      ContentFlag.countDocuments({ status: 'dismissed' }),
      ContentFlag.countDocuments({ status: 'action-taken' }),
    ]);

    return NextResponse.json({
      flags,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: {
        pending: pendingCount,
        reviewed: reviewedCount,
        dismissed: dismissedCount,
        'action-taken': actionTakenCount,
        all: pendingCount + reviewedCount + dismissedCount + actionTakenCount,
      },
    });
  } catch (error) {
    console.error('Error fetching content flags:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
