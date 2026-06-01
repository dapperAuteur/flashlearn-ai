/**
 * Weekly Phase 1 gamification engagement check.
 * Usage: tsx --env-file=.env.local scripts/engagementCheck.ts
 *
 * Decision trigger: avg events per active team OR classroom >= 20 this week
 * → ready to scope Phase 2 (badges + challenges).
 */

import mongoose from 'mongoose';
import fs from 'fs';
import https from 'https';

const MONGODB_URI = process.env.MONGODB_URI;
const ROUTINE_RUN_SECRET = process.env.ROUTINE_RUN_SECRET;
const LAST_WEEK_PATH = '/tmp/last-week-gamification.json';
const ADMIN_MIRROR_URL = 'https://flashlearnai.witus.online/api/routine-runs';
const ROUTINE_SLUG = 'gamification-phase-1-engagement-check';
const TRIGGER_ID = 'trig_01TMJQM61WDknNhGKLTaa6fP';

// ── Inline schemas (avoid importing Next.js model files directly) ────────────

const ActivityEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    visibility: { type: String, default: 'public' },
  },
  { timestamps: true, collection: 'activityevents' },
);

const TeamMemberSchema = new mongoose.Schema(
  { userId: { type: mongoose.Schema.Types.ObjectId }, role: String },
  { _id: false },
);
const TeamSchema = new mongoose.Schema(
  { members: [TeamMemberSchema] },
  { collection: 'teams' },
);

const ClassroomSchema = new mongoose.Schema(
  {
    teacherId: mongoose.Schema.Types.ObjectId,
    students: [mongoose.Schema.Types.ObjectId],
    isArchived: { type: Boolean, default: false },
  },
  { collection: 'classrooms' },
);

const ActivityEvent =
  mongoose.models.ActivityEvent ||
  mongoose.model('ActivityEvent', ActivityEventSchema);
const Team =
  mongoose.models.Team || mongoose.model('Team', TeamSchema);
const Classroom =
  mongoose.models.Classroom || mongoose.model('Classroom', ClassroomSchema);

// ── Helpers ──────────────────────────────────────────────────────────────────

function postToMirror(
  status: 'success' | 'needs_input' | 'error',
  alertLevel: 'info' | 'warning',
  summary: string,
): Promise<void> {
  return new Promise((resolve) => {
    if (!ROUTINE_RUN_SECRET) {
      console.log('[mirror] ROUTINE_RUN_SECRET missing — skipping POST');
      resolve();
      return;
    }
    const body = JSON.stringify({
      routineSlug: ROUTINE_SLUG,
      routineName: 'Gamification Phase 1 engagement check',
      triggerId: TRIGGER_ID,
      runAt: new Date().toISOString(),
      status,
      alertLevel,
      summary,
      link: `https://claude.ai/code/routines/${TRIGGER_ID}`,
    });
    const url = new URL(ADMIN_MIRROR_URL);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ROUTINE_RUN_SECRET}`,
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        if (res.statusCode === 503) {
          console.log('[mirror] 503 — logged, moving on');
        } else {
          console.log(`[mirror] POST ${res.statusCode}`);
        }
        resolve();
      },
    );
    req.on('error', (e) => {
      console.log(`[mirror] POST error: ${e.message} — moving on`);
      resolve();
    });
    req.write(body);
    req.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!MONGODB_URI) {
    const msg =
      'Need MONGODB_URI to read engagement stats. Provide it next week, or BAM can run npm run engagement-check locally.';
    console.log(msg);
    await postToMirror('needs_input', 'info', msg);
    process.exit(0);
  }

  await mongoose.connect(MONGODB_URI);

  const now = new Date();
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ── Fetch raw data ──────────────────────────────────────────────────────────
  const [events, teams, classrooms] = await Promise.all([
    ActivityEvent.find({ createdAt: { $gte: windowStart } })
      .select('userId type')
      .lean(),
    Team.find({}).select('members').lean(),
    Classroom.find({ isArchived: false }).select('teacherId students').lean(),
  ]);

  const totalEvents = events.length;

  // Build membership sets (string IDs for fast lookup)
  const teamMemberSet = new Set<string>();
  const teamMemberToTeams = new Map<string, Set<string>>();
  for (const t of teams as any[]) {
    const tid = String(t._id);
    for (const m of t.members ?? []) {
      const uid = String(m.userId);
      teamMemberSet.add(uid);
      if (!teamMemberToTeams.has(uid)) teamMemberToTeams.set(uid, new Set());
      teamMemberToTeams.get(uid)!.add(tid);
    }
  }

  const classroomMemberSet = new Set<string>();
  const classroomMemberToClassrooms = new Map<string, Set<string>>();
  for (const c of classrooms as any[]) {
    const cid = String(c._id);
    const members = [
      ...(c.students ?? []).map(String),
      String(c.teacherId),
    ];
    for (const uid of members) {
      classroomMemberSet.add(uid);
      if (!classroomMemberToClassrooms.has(uid))
        classroomMemberToClassrooms.set(uid, new Set());
      classroomMemberToClassrooms.get(uid)!.add(cid);
    }
  }

  // ── Count events by type and membership ────────────────────────────────────
  const byType: Record<string, number> = {};
  let teamMemberEvents = 0;
  let classroomMemberEvents = 0;
  const activeTeams = new Set<string>();
  const activeClassrooms = new Set<string>();

  for (const ev of events as any[]) {
    const uid = String(ev.userId);
    byType[ev.type] = (byType[ev.type] ?? 0) + 1;
    if (teamMemberSet.has(uid)) {
      teamMemberEvents++;
      for (const tid of teamMemberToTeams.get(uid) ?? []) activeTeams.add(tid);
    }
    if (classroomMemberSet.has(uid)) {
      classroomMemberEvents++;
      for (const cid of classroomMemberToClassrooms.get(uid) ?? [])
        activeClassrooms.add(cid);
    }
  }

  const totalTeams = teams.length;
  const totalClassrooms = classrooms.length;
  const activeTeamCount = activeTeams.size;
  const activeClassroomCount = activeClassrooms.size;

  const pctTeamsActive =
    totalTeams > 0 ? ((activeTeamCount / totalTeams) * 100).toFixed(1) : 'N/A';
  const pctClassroomsActive =
    totalClassrooms > 0
      ? ((activeClassroomCount / totalClassrooms) * 100).toFixed(1)
      : 'N/A';

  const avgPerActiveTeam =
    activeTeamCount > 0
      ? (teamMemberEvents / activeTeamCount).toFixed(1)
      : '0';
  const avgPerActiveClassroom =
    activeClassroomCount > 0
      ? (classroomMemberEvents / activeClassroomCount).toFixed(1)
      : '0';

  const byTypeSummary = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}:${v}`)
    .join(', ');

  // ── Decision ────────────────────────────────────────────────────────────────
  const avgTeamNum = parseFloat(avgPerActiveTeam);
  const avgClassroomNum = parseFloat(avgPerActiveClassroom);
  const strongSignal = avgTeamNum >= 20 || avgClassroomNum >= 20;

  const decision = strongSignal
    ? 'STRONG SIGNAL: ready to scope Phase 2 (badges + challenges). Decisions are locked in plans/future/01-gamify-study-groups-and-classrooms.md (locally on BAM machine; gitignored). Branch off main and start with the badges Option A scope from that file.'
    : 'Not yet. Re-checking next Monday.';

  // ── Stats output (8-15 lines) ───────────────────────────────────────────────
  const runDate = now.toISOString().slice(0, 10);
  const lines = [
    `Gamification Phase 1 check — ${runDate} (7-day window)`,
    `Total events: ${totalEvents}  |  by type: ${byTypeSummary || 'none'}`,
    `Team-member events: ${teamMemberEvents}  |  Classroom-member events: ${classroomMemberEvents}`,
    `Active teams: ${activeTeamCount}/${totalTeams} (${pctTeamsActive}% with ≥1 event)`,
    `Active classrooms: ${activeClassroomCount}/${totalClassrooms} (${pctClassroomsActive}% with ≥1 event)`,
    `Avg events/active team: ${avgPerActiveTeam}  |  Avg events/active classroom: ${avgPerActiveClassroom}`,
    `Phase 2 trigger threshold: 20 avg events/active group`,
    decision,
  ];

  const summary = lines.join('\n');
  console.log(summary);

  // ── Write current week stats (for reference; won't persist in cloud sandbox) ─
  const weekStats = {
    runAt: now.toISOString(),
    totalEvents,
    teamMemberEvents,
    classroomMemberEvents,
    activeTeamCount,
    totalTeams,
    activeClassroomCount,
    totalClassrooms,
    avgPerActiveTeam: avgTeamNum,
    avgPerActiveClassroom: avgClassroomNum,
    byType,
  };
  try {
    fs.writeFileSync(LAST_WEEK_PATH, JSON.stringify(weekStats, null, 2));
  } catch {
    // non-fatal
  }

  // ── POST to admin mirror ────────────────────────────────────────────────────
  await postToMirror(
    'success',
    strongSignal ? 'warning' : 'info',
    summary,
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  const msg = `Engagement check error: ${err.message}`;
  console.error(msg);
  await postToMirror('error', 'warning', msg).catch(() => {});
  process.exit(1);
});
