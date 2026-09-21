import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// Quick-reference clip for the help article "Reading a Student's Progress" (slug
// reading-a-student-progress, category teams), and the recorded companion to
// docs/tutorials/scripts/04-reading-a-student-progress.md. Captions only — no narration audio
// (witus plans/33 §4 decision 4).
//
// Selectors come from app/(teacher)/teacher/page.tsx (the "Your Classrooms" list, whose Roster
// link carries an sr-only " for <classroom>"), components/teacher/ClassroomRoster.tsx (the
// "Students (N)" roster and the "Progress" link per row) and
// components/teacher/StudentAnalytics.tsx ("Back to the roster", "The short version", "Cards to
// go over (N)", "By set (N)", "Recent sessions (N)").
//
// ─── PRIVACY: THIS CLIP IS PUBLISHED, SO IT MUST NOT FILM A REAL LEARNER ────────────────────────
// The roster and the progress page show whatever students exist on the account being recorded,
// and some of them are minors. This spec therefore REFUSES to run against an undeclared
// classroom: set TUTORIAL_DEMO_CLASSROOM to the demo classroom's exact name (or its 24-character
// id) and it opens only that one. There is no "first classroom" fallback, by design — a fallback
// is how a real class ends up on YouTube.
//
// What must be true of that classroom before recording:
//   * EVERY student on its roster is a demo account, not a real learner. The managed-student
//     tutorial creates exactly such an account ("Tutorial Student"); a roster of those is the
//     intended shape.
//   * The first student on the roster has at least ONE finished study session, or the page shows
//     "No study sessions yet" in place of the report and every caption after step 3 describes
//     something that is not on screen. Step 4 fails with that instruction rather than passing on
//     an empty page.
//   * Prefer a PREVIEW DEPLOYMENT over production. The classroom's live join code is on screen at
//     step 1, and anyone who reads it off the video can join that classroom.
// The spec never types or asserts a student's name, so nothing about a learner is written into
// this repo.
//
// AUTH: requires a signed-in TEACHER session via TUTORIAL_STORAGE_STATE. Skips without it.
//
// SIDE EFFECTS: none. Read-only throughout — no session is started for a student, no claim code
// is minted, nobody is removed from a roster.

const DEMO_CLASSROOM = process.env.TUTORIAL_DEMO_CLASSROOM?.trim();
const IS_ID = /^[0-9a-f]{24}$/i.test(DEMO_CLASSROOM ?? "");

const MISSING_CLASSROOM = [
  "TUTORIAL_DEMO_CLASSROOM is not set.",
  "This clip is published, so it will not open a classroom it was not pointed at:",
  "the roster shows real students, some of them minors.",
  "Set it to the exact name (or the 24-character id) of a classroom whose every student is a",
  "demo account, and re-run. There is deliberately no fallback to the first classroom.",
].join(" ");

defineTutorial(
  {
    slug: "student-progress",
    title: "Read one student's progress",
    startPath: "/teacher",
    requiresAuth: true,
  },
  [
    {
      title: "Start from your classrooms",
      narration:
        "The teacher dashboard lists the classrooms you teach. Roster opens the students in one of them.",
      action: async (page) => {
        if (!DEMO_CLASSROOM) throw new Error(MISSING_CLASSROOM);
        await expect(page.getByRole("heading", { name: "Teacher Dashboard", level: 1 })).toBeVisible();

        if (IS_ID) {
          await page.goto(`/teacher/classrooms/${DEMO_CLASSROOM}`);
          return;
        }
        // The Roster link's accessible name is "Roster for <classroom>" (the sr-only span), so
        // this opens the declared classroom and nothing else.
        const roster = page.getByRole("link", { name: `Roster for ${DEMO_CLASSROOM}` });
        await expect(
          roster,
          `No classroom named "${DEMO_CLASSROOM}" on this account's teacher dashboard. ` +
            "Check TUTORIAL_DEMO_CLASSROOM against the name shown there, or pass its id instead.",
        ).toBeVisible();
        await roster.click();
      },
    },
    {
      title: "Every student has a Progress link",
      narration:
        "Beside Start session, each student on the roster carries Progress. That is the whole way in.",
      action: async (page) => {
        await expect(
          page.getByRole("heading", { name: new RegExp(`^${escapeRe(DEMO_CLASSROOM!)}$`), level: 1 }),
          `Opened a classroom that is not "${DEMO_CLASSROOM}". Refusing to film it.`,
        ).toBeVisible();
        await expect(page.getByRole("heading", { name: /^Students \(/ })).toBeVisible();
        await expect(
          page.getByRole("link", { name: /^progress/i }).first(),
          `The roster of "${DEMO_CLASSROOM}" has no students. Add a demo student first — the ` +
            "managed-student tutorial creates one by name in a few seconds.",
        ).toBeVisible();
      },
    },
    {
      title: "One student, one page",
      narration:
        "The page is headed with the student's name, and Back to the roster returns you to where you started.",
      action: async (page) => {
        await page.getByRole("link", { name: /^progress/i }).first().click();
        await expect(page.getByRole("link", { name: "Back to the roster" })).toBeVisible();
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      },
    },
    {
      title: "The short version, at the top",
      narration:
        "Accuracy all time sits next to accuracy over the last thirty days, with the cards right and wrong those percentages are calculated from.",
      action: async (page) => {
        // No .or(empty-state) here on purpose: an empty report would leave this caption, and the
        // three after it, describing figures that are not on screen.
        await expect(
          page.getByRole("heading", { name: "The short version" }),
          "This student has no finished study sessions, so the page shows \"No study sessions yet\" " +
            "instead of the report and the rest of this clip would narrate an empty page. Run one " +
            "study session for a demo student first, or point TUTORIAL_DEMO_CLASSROOM at a " +
            "classroom whose first student has studied.",
        ).toBeVisible();
        await expect(page.getByText("Accuracy, all time")).toBeVisible();
      },
    },
    {
      title: "An absence is not a zero",
      narration:
        "A student who has never finished a session gets No study sessions yet instead of these numbers. Nought per cent would mean they answered and got everything wrong; that means nothing was recorded.",
      action: async (page) => {
        await expect(page.getByText("Cards right")).toBeVisible();
        await expect(page.getByText("Cards wrong")).toBeVisible();
      },
    },
    {
      title: "The part you act on",
      narration:
        "Cards to go over lists every card missed at least once, worst first, with the mode and direction it goes worst in. That is the ten minutes before the lesson.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: /^Cards to go over \(/ })).toBeVisible();
      },
    },
    {
      title: "Set by set, and session by session",
      narration:
        "Underneath, each set the student has a record in, weakest first, then the last ten finished sessions, marked With an adult or On their own.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: /^By set \(/ })).toBeVisible();
        await expect(page.getByRole("heading", { name: /^Recent sessions \(/ })).toBeVisible();
      },
    },
  ],
);

/** The classroom name goes into a RegExp, and a name may contain (), ?, + and friends. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
