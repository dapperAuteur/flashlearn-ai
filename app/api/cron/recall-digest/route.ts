import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';
import { fireOutboxDrafts, hashUserId } from '@/lib/outbox-trigger';

const BATCH_SIZE = 200;

/**
 * GET /api/cron/recall-digest
 *
 * Daily recall-digest cron (4b2). Summarises the unique sets each active
 * user practiced "today" and fires one outbox draft per user per platform.
 * Date-keyed external_ref keeps re-runs same day idempotent.
 *
 * Auth: same Authorization: Bearer ${CRON_SECRET} pattern as
 * /api/cron/study-reminders. Vercel Cron sets the header automatically.
 *
 * NOTE: vercel.json currently registers only /api/cron/study-reminders
 * because Vercel's free tier allows one daily cron. BAM must add this path
 * to vercel.json (and confirm plan tier allows a second daily cron) before
 * production smoke. Until then this endpoint can be hit manually with the
 * CRON_SECRET bearer.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const ymd = startOfDay.toISOString().slice(0, 10);

    // Aggregate unique sets practiced today per user.
    const groups = await db
      .collection('studySessions')
      .aggregate([
        {
          $match: {
            status: 'completed',
            endTime: { $gte: startOfDay, $lte: now },
            setName: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$userId',
            setNames: { $addToSet: '$setName' },
          },
        },
        { $limit: BATCH_SIZE },
      ])
      .toArray();

    let firedUsers = 0;
    for (const g of groups) {
      const userId = String(g._id);
      const setsPracticedToday: string[] = (g.setNames || []).filter(
        (s: unknown): s is string => typeof s === 'string' && s.length > 0,
      );
      if (setsPracticedToday.length === 0) continue;

      const caption =
        setsPracticedToday.length === 1
          ? `Today: drilled "${setsPracticedToday[0]}" from my recall schedule. Consistency over intensity.`
          : `Today: ${setsPracticedToday.length} recall sets revisited. ${setsPracticedToday
              .slice(0, 3)
              .map((s) => `"${s}"`)
              .join(', ')}${setsPracticedToday.length > 3 ? ', and more' : ''}.`;

      fireOutboxDrafts({
        triggerUserId: userId,
        externalRefBase: `recall-digest-${hashUserId(userId)}-${ymd}`,
        caption,
        platforms: ['twitter', 'bluesky'],
      });
      firedUsers += 1;
    }

    return NextResponse.json({ users: groups.length, fired: firedUsers, ymd });
  } catch (error) {
    console.error('[cron/recall-digest] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
