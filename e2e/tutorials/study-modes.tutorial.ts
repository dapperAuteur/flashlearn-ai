import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";
import { warmStart } from "./_helpers";

// Quick-reference clip for the help article "Study Modes Explained" (slug study-modes-explained,
// category study-modes). Captions only — no narration audio (witus plans/33 §4 decision 4).
//
// Selectors come from components/study/StudySessionSetup.tsx (the three-step Select Set →
// Choose Study Direction → Study Mode wizard, rendered by app/(public)/study/page.tsx) and from
// app/(public)/explore/page.tsx for the "Study Now" entry point.
//
// THE ARTICLE AND THE APP DISAGREE (witus plans/33 §5.2 — the spec follows the app):
//   * The article describes THREE study modes — Classic, Multiple Choice and "Type Your Answer
//     (Hard)". The mode picker offers TWO (StudySessionSetup.tsx:796-851). Type Answer exists as
//     a value (contexts/StudySessionContext.tsx:23) but can only be chosen as a default on
//     /settings (app/(dashboard)/settings/page.tsx:213); there is no way to pick it for one
//     session from this screen.
//   * The article says multiple-choice distractors are "pulled from other cards in the same set".
//     The picker calls them "AI-generated answer options", and the multiple-choice mode is turned
//     off entirely for math-fact sets (StudySessionSetup.tsx:219-233).
//   * The article does not mention the confidence rating being optional per mode, or the Front →
//     Back / Back → Front direction step, which comes first in the app. Back → Front prompts a
//     signed-out visitor to sign up (StudySessionSetup.tsx:258-266).
// The captions below describe the app. Fixing the article is a separate pass.
//
// SIDE EFFECTS: none. The clip stops at "Begin Study Session" without clicking it, so no study
// session, no card result and no spaced-repetition write happens. Signed out throughout, which is
// also what the Explore page promises ("No account required").

defineTutorial(
  {
    slug: "study-modes",
    title: "Pick a direction and a study mode",
    startPath: "/explore",
  },
  [
    {
      title: "Start from any public set",
      narration:
        "Explore lists the community's public sets, and Study Now opens one without an account.",
      action: async (page) => {
        // Longer than the 5s default here only: Explore is the slowest public page to settle
        // when the whole suite hits production back to back. The claim is unchanged.
        await warmStart(page, "/explore");
        await expect(
          page.getByRole("heading", { name: "Explore Flashcard Sets", level: 1 }),
        ).toBeVisible({ timeout: 30_000 });
        await page.getByRole("link", { name: /study now/i }).first().click();
      },
    },
    {
      title: "Step one is already done",
      narration:
        "Arriving from a set skips the picker: the set is chosen and the wizard is on step two.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Choose Your Learning Path", level: 1 })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Choose Study Direction", level: 2 })).toBeVisible();
      },
    },
    {
      title: "Which side you see first",
      narration:
        "Front to Back shows the question and you recall the answer. Back to Front reverses it, and asks a signed-out visitor to sign up.",
      action: async (page) => {
        await expect(page.getByRole("button", { name: /front\s*→\s*back/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /back\s*→\s*front/i })).toBeVisible();
      },
    },
    {
      title: "Choose Front to Back",
      narration: "Pick Front to Back and the mode choices appear underneath.",
      action: async (page) => {
        await page.getByRole("button", { name: /front\s*→\s*back/i }).click();
        await expect(page.getByRole("heading", { name: "Study Mode", level: 2 })).toBeVisible();
      },
    },
    {
      title: "Classic, or multiple choice",
      narration:
        "Classic flips the card and you grade yourself. Multiple Choice puts AI-generated options on the card instead.",
      action: async (page) => {
        const modes = page.getByRole("group", { name: "Study Mode" });
        await expect(modes.getByRole("button", { name: /classic/i })).toBeVisible();
        await expect(modes.getByRole("button", { name: /multiple choice/i })).toBeVisible();
        await modes.getByRole("button", { name: /multiple choice/i }).click();
      },
    },
    {
      title: "Ready to start",
      narration:
        "The last panel confirms how many cards you are about to study and which mode you chose. Begin Study Session starts the clock.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Ready to Start!", level: 2 })).toBeVisible();
        await expect(page.getByText(/mode: multiple choice/i)).toBeVisible();
        // Deliberately not clicked: starting a session writes a real study record.
        await expect(page.getByRole("button", { name: /begin study session/i })).toBeVisible();
      },
    },
  ],
);
