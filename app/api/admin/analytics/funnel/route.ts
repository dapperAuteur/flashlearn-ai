import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import clientPromise from '@/lib/db/mongodb';

const secret = process.env.NEXTAUTH_SECRET;

interface FunnelStep {
  label: string;
  count: number;
  dropOff: number;
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });

  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    await dbConnect();
    const client = await clientPromise;
    const db = client.db();

    // Parse period query param
    const { searchParams } = request.nextUrl;
    const period = searchParams.get('period') || '30d';

    // Build date filter based on period
    let dateFilter: Record<string, unknown> = {};
    if (period !== 'all') {
      const daysMap: Record<string, number> = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };
      const days = daysMap[period] || 30;
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      dateFilter = { createdAt: { $gte: cutoff } };
    }

    // Step 1: Registered — total users in the period
    const registered = await db.collection('users').countDocuments(dateFilter);

    // Step 2: Verified — users with emailVerified: true
    const verified = await db.collection('users').countDocuments({
      ...dateFilter,
      emailVerified: true,
    });

    // Step 3: Created First Set — users who have at least one flashcard set
    // FlashcardSet references Profile via `profile` field, and Profile references User via `user` field.
    // We need to: match users by date -> lookup their profiles -> lookup flashcard_sets by profile id
    const usersWithSets = await db.collection('users').aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'profiles',
          localField: '_id',
          foreignField: 'user',
          as: 'userProfiles',
        },
      },
      {
        $lookup: {
          from: 'flashcard_sets',
          localField: 'userProfiles._id',
          foreignField: 'profile',
          as: 'flashcardSets',
        },
      },
      {
        $match: {
          'flashcardSets.0': { $exists: true },
        },
      },
      {
        $count: 'total',
      },
    ]).toArray();
    const createdFirstSet = usersWithSets.length > 0 ? usersWithSets[0].total : 0;

    // Step 4: First Study Session — users who have at least one study session
    const usersWithSessions = await db.collection('users').aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'studySessions',
          localField: '_id',
          foreignField: 'userId',
          as: 'sessions',
        },
      },
      {
        $match: {
          'sessions.0': { $exists: true },
        },
      },
      {
        $count: 'total',
      },
    ]).toArray();
    const firstStudySession = usersWithSessions.length > 0 ? usersWithSessions[0].total : 0;

    // Step 5: Subscribed — users with a paid subscription tier
    const subscribed = await db.collection('users').countDocuments({
      ...dateFilter,
      subscriptionTier: { $ne: 'Free' },
    });

    // Build funnel steps with drop-off percentages
    const counts = [registered, verified, createdFirstSet, firstStudySession, subscribed];
    const labels = [
      'Registered',
      'Verified Email',
      'Created First Set',
      'First Study Session',
      'Subscribed',
    ];

    const steps: FunnelStep[] = labels.map((label, i) => {
      const count = counts[i];
      let dropOff = 0;
      if (i > 0 && counts[i - 1] > 0) {
        dropOff = Math.round(((counts[i - 1] - count) / counts[i - 1]) * 100);
      }
      return { label, count, dropOff };
    });

    return NextResponse.json({ steps, period });
  } catch (error) {
    console.error('Error fetching funnel analytics:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
