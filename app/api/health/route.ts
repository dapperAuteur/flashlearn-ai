import { NextResponse } from 'next/server';
import type { Mongoose } from 'mongoose';

/**
 * Public uptime probe: GET /api/health
 *
 * Point uptime monitors (Better Stack et al) here rather than at the homepage. The homepage can
 * answer 200 from cache while MongoDB is down, so a green check there means nothing. This route
 * actually touches the database on every request.
 *
 * Contract:
 *   200 {"ok":true,"checks":{"db":"ok"}}
 *   503 {"ok":false,"error":"database_unreachable","checks":{"db":"fail"}}
 *
 * Deliberate constraints:
 *   - Never echoes the underlying error. A Mongo connection failure routinely carries the full
 *     connection URI including the password, so the catch returns a fixed token and logs no error
 *     detail. Nothing about the host, driver, env, or stack leaves this handler.
 *   - Leaks nothing else either: no version, no env values, no counts, no user data. It is public
 *     and unauthenticated (the middleware matcher already excludes /api), so the payload has to be
 *     safe for anyone to read.
 *   - Checks only the critical dependency. No AI provider and no other third-party API is called:
 *     a vendor outage must not turn the uptime monitor red.
 *   - Never cached, and bounded by its own timeout so a hung database returns 503 fast instead of
 *     sitting on the connection helper's longer serverSelectionTimeoutMS.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Shorter than dbConnect's 10s serverSelectionTimeoutMS on purpose: a monitor wants a verdict, not
// a hang. Anything slower than this is already a failed check from a user's point of view.
const DB_TIMEOUT_MS = 4000;

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
} as const;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('health_check_timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Cheapest possible liveness check: the admin `ping` command. It does not read a collection, so it
 * stays constant-cost no matter how large the data set gets.
 *
 * The connection helper is imported dynamically so that a module-load throw (it throws when
 * MONGODB_URI is unset) lands inside our catch instead of crashing the route with a 500.
 */
async function pingDatabase(): Promise<void> {
  const { default: dbConnect } = await import('@/lib/db/dbConnect');
  const connection = (await dbConnect()) as Mongoose;
  const db = connection?.connection?.db;
  if (!db) {
    throw new Error('no_db_handle');
  }
  await db.admin().command({ ping: 1 });
}

export async function GET() {
  try {
    await withTimeout(pingDatabase(), DB_TIMEOUT_MS);
    return NextResponse.json(
      { ok: true, checks: { db: 'ok' } },
      { status: 200, headers: NO_STORE }
    );
  } catch {
    // Intentionally swallows the error object whole. Logging it would put the credentialed
    // connection URI into the log sink, and returning it would publish it. One generic line only.
    console.error('[health] database check failed');
    return NextResponse.json(
      { ok: false, error: 'database_unreachable', checks: { db: 'fail' } },
      { status: 503, headers: NO_STORE }
    );
  }
}
