import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { Logger, LogContext } from '@/lib/logging/logger';
import { findAccountsDueForPurge, purgeUserAccount } from '@/lib/api/purgeUserAccount';

const BATCH_SIZE = 50;

/**
 * GET /api/cron/purge-deleted-accounts
 *
 * Finishes what DELETE /api/user/profile started. That route soft deletes:
 * it stamps `deletedAt` and `purgeScheduledFor` on the user and takes their
 * public sets down, but destroys nothing. This endpoint finds the accounts
 * whose grace period has run out and runs the irreversible purge on each.
 *
 * Signing in during the grace period clears both stamps, so an account that
 * changed its mind never reaches this query.
 *
 * Batched at 50 per run. A backlog drains across runs rather than timing out
 * a single invocation, and every step of purgeUserAccount is idempotent, so a
 * run that dies partway is safe to repeat.
 *
 * Auth: same Authorization: Bearer ${CRON_SECRET} pattern as
 * /api/cron/study-reminders. Vercel Cron sets the header automatically.
 *
 * NOTE: vercel.json registers only /api/cron/study-reminders, because Vercel's
 * free tier allows one daily cron. Scheduling this one is an operator
 * decision: it needs either a plan that allows a second cron, a QStash
 * schedule, or a swap of the existing entry. Until then the endpoint can be
 * hit manually with the CRON_SECRET bearer, and nothing is purged if it never
 * runs.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();

    const dueIds = await findAccountsDueForPurge(new Date(), BATCH_SIZE);

    if (dueIds.length === 0) {
      return NextResponse.json({ purged: 0, failed: 0, message: 'No accounts due for purge' });
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
        console.error(`[cron/purge-deleted-accounts] Failed for ${userId.toString()}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ purged, failed, total: dueIds.length });
  } catch (error) {
    console.error('[cron/purge-deleted-accounts] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
