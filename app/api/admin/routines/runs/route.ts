import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import dbConnect from '@/lib/db/dbConnect';
import { RoutineRun } from '@/models/RoutineRun';

const secret = process.env.NEXTAUTH_SECRET;

// GET /api/admin/routines/runs
// Admin-gated read of recent routine runs.
// Query params:
//   limit (default 50, max 200) — number of runs to return
//   slug (optional) — filter to a single routine slug
//   alertLevel (optional) — filter to 'alert' / 'warning' / 'info'
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret });
  if (!token || token.role !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = Number(searchParams.get('limit'));
  const limit = Math.min(200, Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50);
  const slug = searchParams.get('slug');
  const alertLevel = searchParams.get('alertLevel');

  const filter: Record<string, unknown> = {};
  if (slug) filter.routineSlug = slug;
  if (alertLevel && ['info', 'warning', 'alert'].includes(alertLevel)) {
    filter.alertLevel = alertLevel;
  }

  try {
    await dbConnect();
    const runs = await RoutineRun.find(filter).sort({ runAt: -1 }).limit(limit).lean();
    return NextResponse.json({ runs });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch routine runs' }, { status: 500 });
  }
}
