import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';
import { getReengagementTemplate } from '@/lib/email/templates/reengagement';
import { sendEmail } from '@/lib/email/sendEmail';

const BATCH_SIZE = 50;
const CRON_SECRET = process.env.CRON_SECRET || process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY;

/**
 * GET /api/cron/study-reminders
 *
 * Daily cron endpoint that sends study reminder emails to users
 * who have enabled reminders and whose preferred time matches
 * the current hour (UTC).
 *
 * Secured via CRON_SECRET header or Vercel Cron authorization.
 * Schedule: daily at the top of each hour via Vercel Cron or QStash.
 */
export async function GET(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get('authorization');
  const isVercelCron = authHeader === `Bearer ${CRON_SECRET}`;
  const isQStash = request.headers.get('upstash-signature');

  if (!isVercelCron && !isQStash) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // Current hour in UTC (e.g., "09", "14")
    const currentHour = new Date().getUTCHours().toString().padStart(2, '0');

    // Find users with reminders enabled whose preferred time matches current hour
    // studyReminderTime is stored as "HH:MM" (e.g., "09:00")
    const users = await db
      .collection('users')
      .find({
        studyReminderEnabled: true,
        studyReminderTime: { $regex: `^${currentHour}:` },
        email: { $exists: true, $ne: null },
      })
      .project({ _id: 1, name: 1, email: 1 })
      .limit(BATCH_SIZE)
      .toArray();

    if (users.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No users due for reminders this hour' });
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
