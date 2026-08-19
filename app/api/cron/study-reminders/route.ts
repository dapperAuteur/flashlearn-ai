import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/db/mongodb';
import dbConnect from '@/lib/db/dbConnect';
import { Logger, LogContext } from '@/lib/logging/logger';
import { getReengagementTemplate } from '@/lib/email/templates/reengagement';
import { sendEmail } from '@/lib/email/sendEmail';
import { findAccountsDueForPurge, purgeUserAccount } from '@/lib/api/purgeUserAccount';

const BATCH_SIZE = 200;
const PURGE_BATCH_SIZE = 50;

/**
 * GET /api/cron/study-reminders
 *
 * THIS IS THE SCHEDULED PATH. `vercel.json` registers this route and no other,
 * because Vercel's free tier allows one cron a day. Anything that needs a daily
 * run has to ride along here.
 *
 * Two phases run per invocation, in this order:
 *   1. Study reminder emails to every user with reminders enabled.
 *   2. The account purge sweep, erasing accounts whose 30-day grace period
 *      has run out.
 *
 * The phases are independent and each is wrapped on its own. A thrown reminder
 * batch cannot stop the purge, and a thrown purge cannot make the response
 * look like the emails failed. Both outcomes come back in one summary.
 *
 * /api/cron/purge-deleted-accounts holds the same purge sweep behind a manual
 * trigger. It is NOT on a schedule. Do not assume it runs.
 *
 * Daily at 13:00 UTC / 8am EST. For per-hour scheduling, use QStash separately.
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

  const reminders = await runRemindersPhase();
  const purge = await runPurgePhase();

  return NextResponse.json({ reminders, purge });
}

interface RemindersSummary {
  sent: number;
  failed: number;
  total: number;
  message?: string;
  error?: string;
}

interface PurgeSummary {
  purged: number;
  failed: number;
  total: number;
  message?: string;
  error?: string;
}

// Phase 1. Returns a summary instead of throwing, so the purge phase still
// runs when the mail provider or the query is having a bad day.
async function runRemindersPhase(): Promise<RemindersSummary> {
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
      return { sent: 0, failed: 0, total: 0, message: 'No users with reminders enabled' };
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

    return { sent, failed, total: users.length };
  } catch (error) {
    console.error('[cron/study-reminders] Reminders phase failed:', error);
    return {
      sent: 0,
      failed: 0,
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Phase 2. Same shape and same reasoning in reverse: a failure here is reported
// rather than thrown, so it cannot rewrite the reminder result as a 500.
//
// Batched at 50 per run. A backlog drains across runs rather than timing out a
// single invocation, and every step of purgeUserAccount is idempotent, so a run
// that dies partway is safe to repeat.
async function runPurgePhase(): Promise<PurgeSummary> {
  try {
    await dbConnect();

    const dueIds = await findAccountsDueForPurge(new Date(), PURGE_BATCH_SIZE);

    if (dueIds.length === 0) {
      return { purged: 0, failed: 0, total: 0, message: 'No accounts due for purge' };
    }

    let purged = 0;
    let failed = 0;

    for (const userId of dueIds) {
      try {
        const result = await purgeUserAccount(userId, {
          requestId: `cron-purge-${userId.toString()}`,
          requesterIp: 'cron',
        });

        Logger.info(LogContext.USER, 'Account purged after grace period', {
          userId: userId.toString(),
          deletedRecordCount: result.deletedRecordCount,
          anonymizedRecordCount: result.anonymizedRecordCount,
          membershipsPulled: result.membershipsPulled,
        });

        purged++;
      } catch (err) {
        // One bad account must not stop the batch. The row keeps its stamps,
        // so the next run tries it again.
        console.error(`[cron/study-reminders] Purge failed for ${userId.toString()}:`, err);
        failed++;
      }
    }

    return { purged, failed, total: dueIds.length };
  } catch (error) {
    console.error('[cron/study-reminders] Purge phase failed:', error);
    return {
      purged: 0,
      failed: 0,
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
