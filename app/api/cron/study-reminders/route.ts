import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';
import { getReengagementTemplate } from '@/lib/email/templates/reengagement';
import { sendEmail } from '@/lib/email/sendEmail';

const BATCH_SIZE = 200;

/**
 * GET /api/cron/study-reminders
 *
 * Daily cron endpoint (runs once at 13:00 UTC / 8am EST via Vercel Cron).
 * Sends study reminder emails to all users with reminders enabled.
 *
 * Vercel free tier allows 1 cron/day — this single daily run covers
 * all reminder users. For per-hour scheduling, use QStash separately.
 *
 * Auth: Vercel Cron sets Authorization header automatically using CRON_SECRET.
 * Generate CRON_SECRET with: openssl rand -hex 32
 * Add it to Vercel env vars as CRON_SECRET.
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

    const users = await db
      .collection('users')
      .find({
        studyReminderEnabled: true,
        email: { $exists: true, $ne: null },
      })
      .project({ _id: 1, name: 1, email: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    if (users.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No users with reminders enabled' });
    }

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const { subject, html } = getReengagementTemplate(
          'study-reminder',
          user.name || 'Learner'
        );

        await sendEmail({
          to: user.email,
          subject,
          html,
        });

        sent++;
      } catch (err) {
        console.error(`[cron/study-reminders] Failed to send to ${user.email}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ sent, failed, total: users.length });
  } catch (error) {
    console.error('[cron/study-reminders] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
