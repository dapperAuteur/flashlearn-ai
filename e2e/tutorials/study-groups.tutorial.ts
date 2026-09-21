import { expect } from "@playwright/test";
import { defineTutorial, type TutorialStep } from "./tutorial";

// Quick-reference clip for the help article "Teams & Classrooms" (slug teams-and-classrooms,
// category teams). Captions only — no narration audio (witus plans/33 §4 decision 4).
//
// Selectors come from app/(dashboard)/team/page.tsx (the "My Study Groups" hub, the "Create Study
// Group" link, the "Join with Code" button and the join form it reveals),
// components/teams/TeamCard.tsx (each card is a listitem labelled "Team: <name>", printing member
// count and join code) and app/(teacher)/teacher/page.tsx (the Teacher Dashboard and its "Your
// Classrooms" list, whose Roster link carries an sr-only " for <classroom>").
//
// ─── PRIVACY: THIS CLIP IS PUBLISHED, SO IT MUST NOT FILM REAL GROUPS ──────────────────────────
// The hub lists EVERY study group the recording account belongs to, and each card prints that
// group's live join code (TeamCard.tsx:69) — anyone who reads one off the video can join that
// group. /teacher does the same for classrooms (teacher/page.tsx:164). So:
//   * TUTORIAL_DEMO_STUDY_GROUP must name the demo group to film, exactly as the card shows it.
//     Unset, the spec fails rather than filming whatever is there; there is no "first group"
//     fallback.
//   * EVERY group on the recording account has to be a demo group, because they are all on
//     screen at step 1. Same for classrooms if the teacher step is built.
//   * Prefer a PREVIEW DEPLOYMENT over production, for the join codes alone.
//   * The optional teacher step is built only when TUTORIAL_DEMO_CLASSROOM names a demo
//     classroom, and it only proves classrooms live in a different area.
//
// THE ARTICLE AND THE APP DISAGREE (witus plans/33 §5.2 — the spec follows the app):
//   * The article says "Go to Teams → Create Team". The page is titled "My Study Groups" and the
//     control reads "Create Study Group"; the join code field asks for a 6-digit code.
//   * The article does not mention the 3-member invite cap the hub states in its own subtitle
//     ("invite up to 3 members per group by email").
//   * The article's classroom half (enrol students, assign sets, track progress, run classroom
//     challenges) lives under /teacher, a different area with its own dashboard — not under Teams.
// The captions below describe the app. Fixing the article is a separate pass.
//
// AUTH: requires a signed-in session via TUTORIAL_STORAGE_STATE. Skips without it.
//
// SIDE EFFECTS: creates-data only under an env flag. As written, nothing is created: the join
// form is opened but never submitted (submitting joins a real group with real members), and the
// create form is not opened. Set TUTORIAL_CREATE_STUDY_GROUP=1 to build the extra step that opens
// /team/create — built conditionally so marks.json always matches what was recorded — and even
// that step stops at the empty form without saving.

const DEMO_GROUP = process.env.TUTORIAL_DEMO_STUDY_GROUP?.trim();
const DEMO_CLASSROOM = process.env.TUTORIAL_DEMO_CLASSROOM?.trim();
const SHOW_CREATE = process.env.TUTORIAL_CREATE_STUDY_GROUP === "1";

const MISSING_GROUP = [
  "TUTORIAL_DEMO_STUDY_GROUP is not set.",
  "This clip is published and the study-group hub prints every group's live join code,",
  "so it will not film groups it was not pointed at.",
  "Set it to the exact name of a demo group on this account and re-run.",
].join(" ");

const steps: TutorialStep[] = [
  {
    title: "Your study groups",
    narration:
      "Study groups live at /team. This is where the groups you are in are listed, each with its member count and its join code.",
    action: async (page) => {
      if (!DEMO_GROUP) throw new Error(MISSING_GROUP);
      await expect(page.getByRole("heading", { name: "My Study Groups", level: 1 })).toBeVisible();
      await expect(
        page.getByRole("listitem", { name: `Team: ${DEMO_GROUP}` }),
        `No study group named "${DEMO_GROUP}" on this account. Check TUTORIAL_DEMO_STUDY_GROUP ` +
          "against the name on the card. Refusing to film an undeclared group.",
      ).toBeVisible();
    },
  },
  {
    title: "Two ways in",
    narration:
      "Create Study Group starts one of your own. Join with Code puts you in somebody else's.",
    action: async (page) => {
      await expect(page.getByRole("link", { name: "Create a new study group" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Join an existing study group with a code" })).toBeVisible();
    },
  },
  {
    title: "Joining takes a six-digit code",
    narration:
      "Join with Code opens one field. The person who made the group hands you the six-digit code.",
    action: async (page) => {
      await page.getByRole("button", { name: "Join an existing study group with a code" }).click();
      await expect(page.getByRole("heading", { name: "Join a Study Group" })).toBeVisible();
      await expect(page.getByPlaceholder("Enter 6-digit join code")).toBeVisible();
      // Deliberately not filled or submitted: joining adds you to a real group of real people.
    },
  },
  {
    title: "Groups are small on purpose",
    narration:
      "A study group shares sets and studies together, and you can invite up to three members per group by email.",
    action: async (page) => {
      await expect(page.getByText(/invite up to 3 members per group by email/i)).toBeVisible();
      await expect(
        page.getByRole("listitem", { name: `Team: ${DEMO_GROUP}` }).getByText(/\d+ members?/),
      ).toBeVisible();
    },
  },
];

if (SHOW_CREATE) {
  steps.push({
    title: "Making one of your own",
    narration:
      "Create Study Group asks for a name, and hands you the join code to pass on once it is saved.",
    action: async (page) => {
      await page.getByRole("link", { name: "Create a new study group" }).click();
      await expect(page).toHaveURL(/\/team\/create/);
      // Deliberately not saved: a saved group is a real group with a real join code.
    },
  });
}

// Built only against a declared demo classroom — /teacher lists every classroom the account
// teaches, with each one's live join code beside it.
if (DEMO_CLASSROOM) {
  steps.push({
    title: "Classrooms are a different area",
    narration:
      "A teacher's classrooms are not here. They live under /teacher, with a roster per class and a join code of its own.",
    action: async (page) => {
      await page.goto("/teacher");
      await expect(page.getByRole("heading", { name: "Teacher Dashboard", level: 1 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Your Classrooms" })).toBeVisible();
      const roster = /^[0-9a-f]{24}$/i.test(DEMO_CLASSROOM)
        ? page.getByRole("link", { name: /^roster/i })
        : page.getByRole("link", { name: `Roster for ${DEMO_CLASSROOM}` });
      await expect(
        roster.first(),
        `No classroom named "${DEMO_CLASSROOM}" on this account's teacher dashboard.`,
      ).toBeVisible();
    },
  });
}

defineTutorial(
  {
    slug: "study-groups",
    title: "Study groups, and where classrooms live",
    startPath: "/team",
    requiresAuth: true,
  },
  steps,
);
