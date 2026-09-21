import { expect } from "@playwright/test";
import { defineTutorial, type TutorialStep } from "./tutorial";

// Quick-reference clip for the help article "Sharing Your Milestones" (slug
// sharing-your-milestones, category account). Captions only — no narration audio (witus plans/33
// §4 decision 4).
//
// Selectors come from app/(dashboard)/settings/page.tsx: the "Sharing your milestones" panel, its
// switch (role="switch", aria-labelledby outbox-optin-label, with the word On or Off printed
// beside it so the state is never colour alone) and the live status line that reports the save.
//
// AUTH: requires a signed-in session via TUTORIAL_STORAGE_STATE. Skips without it.
//
// SIDE EFFECTS: none as written. The switch writes the account's opt-in as soon as it is clicked,
// so this clip reads the panel rather than flipping it. Set TUTORIAL_TOGGLE_MILESTONES=1 to build
// the two extra steps that turn it on and straight back off — the steps are added conditionally,
// never skipped at runtime, so marks.json always matches what was recorded. Even then it only
// touches the recording account's own setting, and turning the setting on does not publish
// anything: drafts go to a review queue a person reads.

const TOGGLE = process.env.TUTORIAL_TOGGLE_MILESTONES === "1";

const steps: TutorialStep[] = [
  {
    title: "Settings, near the bottom",
    narration:
      "The milestone setting lives on the Settings page, under your study preferences and reminders.",
    action: async (page) => {
      await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Sharing your milestones" })).toBeVisible();
    },
  },
  {
    title: "Off unless you turn it on",
    narration:
      "It is off by default. The page says so in words above the switch: nothing is shared unless you turn this on.",
    action: async (page) => {
      await expect(page.getByText("Off by default. Nothing is shared unless you turn this on.")).toBeVisible();
    },
  },
  {
    title: "What it does when it is on",
    narration:
      "Turned on, a milestone such as a study streak or a set you make public becomes a draft social post.",
    action: async (page) => {
      await expect(page.getByText("Turn my study milestones into draft social posts")).toBeVisible();
    },
  },
  {
    title: "A person reads every draft",
    narration:
      "Nothing is published automatically. Someone on the team reads each draft and decides whether to post it, edit it, or bin it.",
    action: async (page) => {
      await expect(page.getByText(/nothing is published automatically/i)).toBeVisible();
    },
  },
  {
    title: "The switch says which way it is set",
    narration:
      "The switch prints On or Off beside it, so you never have to read the colour to know where you stand.",
    action: async (page) => {
      await expect(page.getByRole("switch", { name: /turn my study milestones/i })).toBeVisible();
    },
  },
];

if (TOGGLE) {
  steps.push(
    {
      title: "Turning it on saves straight away",
      narration:
        "Flipping the switch saves on its own. There is no Save button to press for this one.",
      action: async (page) => {
        const sw = page.getByRole("switch", { name: /turn my study milestones/i });
        await sw.click();
        // The exact "on" message, not a loose /saved/ — a loose match would also pass on the
        // "off" message and this caption would describe the wrong state.
        await expect(
          page.getByText("Saved. Your milestones can now be drafted as posts for review."),
          "The switch was already ON when this run started, so clicking it turned it OFF. " +
            "Set it back to off on /settings before recording.",
        ).toBeVisible();
      },
    },
    {
      title: "And off again",
      narration:
        "Turn it off and new drafts stop being written. Drafts already in the review queue stay there.",
      action: async (page) => {
        const sw = page.getByRole("switch", { name: /turn my study milestones/i });
        await sw.click();
        await expect(
          page.getByText("Saved. No new drafts will be written from your milestones."),
        ).toBeVisible();
      },
    },
  );
}

defineTutorial(
  {
    slug: "milestone-sharing",
    title: "Turn milestone sharing on or off",
    startPath: "/settings",
    requiresAuth: true,
  },
  steps,
);
