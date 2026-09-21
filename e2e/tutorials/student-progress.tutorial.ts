import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// Quick-reference clip for the help article "Reading a Student's Progress" (slug
// reading-a-student-progress, category teams), and the recorded companion to
// docs/tutorials/scripts/04-reading-a-student-progress.md. Captions only — no narration audio
// (witus plans/33 §4 decision 4).
//
// Selectors come from components/teacher/ClassroomRoster.tsx (the "Students (N)" roster and the
// "Progress" link on each row) and components/teacher/StudentAnalytics.tsx (the "Back to the
// roster" link, the "The short version" summary, "Cards to go over", "By set", "Recent sessions",
// and the "No study sessions yet" block that replaces the report when nothing was recorded).
//
// AUTH: requires a signed-in TEACHER session via TUTORIAL_STORAGE_STATE, on an account that
// teaches at least one classroom that is NOT archived and has at least one student on the roster.
// Skips without the storage state; fails loudly rather than quietly if the roster is empty.
//
// SIDE EFFECTS: none. Read-only throughout — no session is started for a student, no claim code
// is minted, nobody is removed from a roster.
//
// PRIVACY: this clip opens a real student's record on the recorder's own roster, so the frame
// will show that student's name and numbers. Record it against a preview deployment or a
// classroom of test accounts, not a live class. The spec never types or asserts a student's name,
// so nothing about a real learner is written into this repo.

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
        await expect(page.getByRole("heading", { name: "Teacher Dashboard", level: 1 })).toBeVisible();
        await page.getByRole("link", { name: /roster/i }).first().click();
      },
    },
    {
      title: "Every student has a Progress link",
      narration:
        "Beside Start session, each student on the roster carries Progress. That is the whole way in.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: /^Students \(/ })).toBeVisible();
        await expect(page.getByRole("link", { name: /^progress/i }).first()).toBeVisible();
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
        // Either the report or the empty block renders; both are the page working correctly.
        const summary = page.getByRole("heading", { name: "The short version" });
        const empty = page.getByRole("heading", { name: "No study sessions yet" });
        await expect(summary.or(empty)).toBeVisible();
      },
    },
    {
      title: "An absence is not a zero",
      narration:
        "A student who has never finished a session gets No study sessions yet instead of the report. Nought per cent would mean they answered and got everything wrong; this means nothing was recorded.",
      action: async (page) => {
        await expect(
          page.getByText(/accuracy, all time/i).or(page.getByRole("heading", { name: "No study sessions yet" })),
        ).toBeVisible();
      },
    },
    {
      title: "The part you act on",
      narration:
        "Cards to go over lists every card missed at least once, worst first, with the mode and direction it goes worst in. That is the ten minutes before the lesson.",
      action: async (page) => {
        await expect(
          page
            .getByRole("heading", { name: /^Cards to go over \(/ })
            .or(page.getByRole("heading", { name: "No study sessions yet" })),
        ).toBeVisible();
      },
    },
    {
      title: "Set by set, and session by session",
      narration:
        "Underneath, each set the student has a record in, weakest first, then the last ten finished sessions, marked With an adult or On their own.",
      action: async (page) => {
        await expect(
          page
            .getByRole("heading", { name: /^Recent sessions \(/ })
            .or(page.getByRole("heading", { name: "No study sessions yet" })),
        ).toBeVisible();
      },
    },
  ],
);
