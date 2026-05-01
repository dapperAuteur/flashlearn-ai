// Static catalog of the scheduled routines configured at claude.ai/code/routines.
// Update this list whenever a routine is added, renamed, disabled, or deleted.
// Each row links to the canonical Claude routines page where you can see full
// run history, transcripts, edit the schedule, or re-run on demand.
//
// The admin /admin/routines page reads this list to render "what's scheduled"
// and joins against the RoutineRun collection to render "last summary".
export interface ScheduledRoutine {
  slug: string;
  name: string;
  triggerId: string;
  schedule: string;
  reason: string;
  link: string;
}

export const SCHEDULED_ROUTINES: ScheduledRoutine[] = [
  {
    slug: 'post-finals-counter-reset-check',
    name: 'Post-finals counter reset check',
    triggerId: 'trig_01Dy4bvTs4SBnQduBu96M2L6',
    schedule: 'Once at 2026-06-01 07:00 UTC (= 03:00 ET)',
    reason: 'Drafts the support-triage list 1 hour after the finals promo cutoff.',
    link: 'https://claude.ai/code/routines/trig_01Dy4bvTs4SBnQduBu96M2L6',
  },
  {
    slug: 'post-finals-revert-verification',
    name: 'Post-finals revert verification',
    triggerId: 'trig_01J3LLhhKyM5bjVjhVAwaBjz',
    schedule: 'Once at 2026-06-01 19:00 UTC (= 15:00 ET)',
    reason: 'Confirms /api/promo/active, banner, and pricing pill all reverted cleanly 12 hours after the cutoff.',
    link: 'https://claude.ai/code/routines/trig_01J3LLhhKyM5bjVjhVAwaBjz',
  },
  {
    slug: 'gamification-phase-1-engagement-check',
    name: 'Gamification Phase 1 engagement check',
    triggerId: 'trig_01TMJQM61WDknNhGKLTaa6fP',
    schedule: 'Weekly Mon 13:00 UTC (= 09:00 ET)',
    reason: 'Detects when leaderboard + activity feed engagement justifies shipping Phase 2 (badges + challenges).',
    link: 'https://claude.ai/code/routines/trig_01TMJQM61WDknNhGKLTaa6fP',
  },
  {
    slug: 'fall-k12-readiness-kickoff-check',
    name: 'Fall K-12 readiness kickoff check',
    triggerId: 'trig_01QeZGhbgd3Snx4hy9c6viZ9',
    schedule: 'Once at 2026-08-25 13:00 UTC (= 09:00 ET)',
    reason: 'Checks whether summer revenue cushion is met and drafts the K-12 counsel-engagement plan if so.',
    link: 'https://claude.ai/code/routines/trig_01QeZGhbgd3Snx4hy9c6viZ9',
  },
  {
    slug: 'recon-probe-volume-monitor',
    name: 'Recon probe volume monitor',
    triggerId: 'trig_01NUfDoX6H3EkmcmHzsuFjnU',
    schedule: 'Daily 12:00 UTC (= 08:00 ET)',
    reason: 'Watches recon-probe traffic and alerts when volume justifies escalating to Option 2 / 3.',
    link: 'https://claude.ai/code/routines/trig_01NUfDoX6H3EkmcmHzsuFjnU',
  },
];

export const ROUTINES_DASHBOARD_URL = 'https://claude.ai/code/routines';
