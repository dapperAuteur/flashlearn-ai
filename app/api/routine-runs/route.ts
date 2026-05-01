import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/dbConnect';
import { RoutineRun } from '@/models/RoutineRun';
import { Logger, LogContext } from '@/lib/logging/logger';

// POST /api/routine-runs
// Public-but-secret-gated write endpoint. Scheduled remote agents (claude.ai
// routines) call this at the end of every run to mirror their summary into
// the FL-AI database so BAM can scan recent runs at /admin/routines.
//
// Auth: shared bearer token in env ROUTINE_RUN_SECRET. Required because the
// agents run in Anthropic's cloud and don't have user sessions.

const STATUS_VALUES = ['success', 'error', 'needs_input'] as const;
const ALERT_VALUES = ['info', 'warning', 'alert'] as const;

export async function POST(request: NextRequest) {
  const expected = process.env.ROUTINE_RUN_SECRET;
  if (!expected) {
    Logger.error(LogContext.SYSTEM, 'ROUTINE_RUN_SECRET not configured; rejecting routine-run write.');
    return NextResponse.json({ error: 'Server not configured' }, { status: 503 });
  }

  const auth = request.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    routineSlug,
    routineName,
    triggerId,
    runAt,
    status,
    alertLevel,
    summary,
    details,
    link,
  } = body ?? {};

  if (typeof routineSlug !== 'string' || !routineSlug.trim()) {
    return NextResponse.json({ error: 'routineSlug is required' }, { status: 400 });
  }
  if (typeof routineName !== 'string' || !routineName.trim()) {
    return NextResponse.json({ error: 'routineName is required' }, { status: 400 });
  }
  if (typeof summary !== 'string' || !summary.trim()) {
    return NextResponse.json({ error: 'summary is required' }, { status: 400 });
  }
  if (summary.length > 4000) {
    return NextResponse.json({ error: 'summary must be 4000 characters or fewer' }, { status: 400 });
  }
  if (details && (typeof details !== 'string' || details.length > 16000)) {
    return NextResponse.json({ error: 'details must be 16000 characters or fewer' }, { status: 400 });
  }
  const runAtMs = runAt ? new Date(runAt).getTime() : Date.now();
  if (Number.isNaN(runAtMs)) {
    return NextResponse.json({ error: 'runAt must be a valid ISO 8601 date' }, { status: 400 });
  }
  const finalStatus = STATUS_VALUES.includes(status) ? status : 'success';
  const finalAlertLevel = ALERT_VALUES.includes(alertLevel) ? alertLevel : 'info';

  try {
    await dbConnect();
    const doc = await RoutineRun.create({
      routineSlug: routineSlug.trim(),
      routineName: routineName.trim(),
      triggerId: typeof triggerId === 'string' ? triggerId.trim() : undefined,
      runAt: new Date(runAtMs),
      status: finalStatus,
      alertLevel: finalAlertLevel,
      summary: summary.trim(),
      details: typeof details === 'string' ? details.trim() : undefined,
      link: typeof link === 'string' ? link.trim() : undefined,
    });
    return NextResponse.json({ id: doc._id.toString() }, { status: 201 });
  } catch (error) {
    Logger.error(LogContext.SYSTEM, 'Failed to write routine run', { routineSlug, error });
    return NextResponse.json({ error: 'Failed to write routine run' }, { status: 500 });
  }
}
