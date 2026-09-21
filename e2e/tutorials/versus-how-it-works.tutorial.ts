import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// Quick-reference clip for the help article "How Versus Mode Works" (slug versus-mode-guide,
// category versus). Captions only — no narration audio (witus plans/33 §4 decision 4).
//
// Selectors come from app/(public)/versus/how-it-works/page.tsx: the scoringComponents list
// (Accuracy 40%, Speed 25%, Confidence 20%, Streak 15%), the three challenge-type cards, the
// Rules list, and the FAQ accordion (a button per question, answer revealed on click).
//
// SIDE EFFECTS: none. This is the signed-out explainer page only. Creating or joining a challenge
// notifies real opponents and puts a real score on a real leaderboard, so no new spec does it —
// the page's final call to action ("Sign Up & Start Competing" when signed out) is filmed but not
// clicked.

defineTutorial(
  {
    slug: "versus-how-it-works",
    title: "How Versus Mode scores a challenge",
    startPath: "/versus/how-it-works",
  },
  [
    {
      title: "Versus, explained in one page",
      narration:
        "The public explainer for Versus Mode lives at /versus/how-it-works. No account needed to read it.",
      action: async (page) => {
        await expect(
          page.getByRole("heading", { name: "Challenge Your Friends to Learn", level: 1 }),
        ).toBeVisible();
      },
    },
    {
      title: "Three steps to a challenge",
      narration:
        "Pick a set and create the challenge, share the code, then everyone studies the same cards in the same order.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "How It Works", level: 2 })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Pick a Set & Create" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Share the Code" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Compete & Compare" })).toBeVisible();
      },
    },
    {
      title: "The score is four numbers, not one",
      narration:
        "A score is out of one thousand: accuracy is forty per cent of it, speed twenty-five, confidence twenty, and your longest streak fifteen.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Scoring System", level: 2 })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Accuracy" })).toBeVisible();
        await expect(page.getByText("40%", { exact: true })).toBeVisible();
        await expect(page.getByText("0-400", { exact: true })).toBeVisible();
      },
    },
    {
      title: "Confidence cuts both ways",
      narration:
        "Confidence is scored against your actual answers: sure and right scores well, sure and wrong is penalised.",
      action: async (page) => {
        await expect(
          page.getByText(/high confidence \+ wrong = penalty/i),
        ).toBeVisible();
      },
    },
    {
      title: "Direct, classroom, or public",
      narration:
        "Direct is a private code for up to ten players, classroom is for a teacher's class up to thirty, and public is open to anyone up to fifty.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Challenge Types", level: 2 })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Direct" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Classroom" })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Public" })).toBeVisible();
      },
    },
    {
      title: "One attempt, and a clock",
      narration:
        "You get one attempt per challenge, and a challenge expires after twenty-four hours on the free plan or seventy-two on Pro.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Rules", level: 2 })).toBeVisible();
        await expect(page.getByText(/one attempt per challenge/i)).toBeVisible();
        await expect(page.getByText(/expire after 24 hours \(free\) or 72 hours \(pro\)/i)).toBeVisible();
      },
    },
    {
      title: "The questions people ask",
      narration:
        "The FAQ at the bottom opens one question at a time. Challenge study still counts toward your spaced repetition schedule.",
      action: async (page) => {
        await page
          .getByRole("button", { name: /does challenge study count toward my spaced repetition schedule/i })
          .click();
        await expect(page.getByText(/updates your review schedule just like a regular study session/i)).toBeVisible();
      },
    },
  ],
);
