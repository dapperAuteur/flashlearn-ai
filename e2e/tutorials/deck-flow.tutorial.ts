import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// "From notes to flashcards in two minutes" — Tutorial B from witus plans/31 (narration verbatim;
// BAM records one audio file per step). Selectors come from the 2026-08-16 flow map of this repo
// (components/home/HomeControl.tsx, app/(dashboard)/generate/page.tsx, FlashcardManager,
// StudySessionSetup/StudyCard/ConfidenceScale).
//
// RECORDING NOTES (also in plans/31): needs a signed-in account with AI generations available —
// every recording run consumes ONE generation from that account's quota. Provide the session via
// TUTORIAL_STORAGE_STATE (see playwright.tutorial.config.ts header); without it this spec SKIPS.
// The final two steps interact with the first study card only, then end the session — the results
// screen locators are tolerant on purpose; expect to tune pacing after the first real recording.

const NOTES = `Spaced repetition schedules reviews at increasing intervals right before you forget.
The testing effect: retrieving a memory strengthens it more than re-reading does.
Confidence ratings improve scheduling because miscalibrated cards need earlier review.`;

defineTutorial(
  {
    slug: "deck-flow",
    title: "From notes to flashcards in two minutes",
    requiresAuth: true,
  },
  [
    {
      title: "FlashLearnAI",
      narration:
        "FlashLearnAI turns anything you're studying into flashcards — and then makes sure you actually remember them. Here's the whole loop, start to finish.",
      action: async (page) => {
        await expect(page.locator("h1").first()).toBeVisible();
      },
    },
    {
      title: "Open the generator",
      narration:
        "This is the generator. You can paste text, upload a CSV or a PDF, even point it at a YouTube video. Today: plain notes.",
      action: async (page) => {
        await page.getByRole("link", { name: /generate|try ai generator/i }).first().click();
        await expect(page.getByRole("heading", { name: /generate flashcards/i })).toBeVisible();
      },
    },
    {
      title: "Paste your notes",
      narration: "I'm pasting my study notes straight in — no formatting needed.",
      action: async (page) => {
        await page.getByPlaceholder(/paste your content here/i).fill(NOTES);
      },
    },
    {
      title: "Steer the AI and name the set",
      narration:
        "You can steer the AI — definitions only, undergraduate level — and give the set a name.",
      action: async (page) => {
        await page.getByPlaceholder(/undergraduate level|definitions only/i).fill("Definitions only, concise");
        await page.getByPlaceholder(/biology chapter 7/i).fill("How Memory Works");
      },
    },
    {
      title: "Generate",
      narration: "One click, a few seconds… and there's the deck. Every card is editable before you keep it.",
      action: async (page) => {
        await page.getByRole("button", { name: /generate with ai/i }).click();
        // AI round-trip: generous wait for the preview grid / save controls to appear.
        await expect(page.getByRole("button", { name: /save to account/i })).toBeVisible({ timeout: 120_000 });
      },
    },
    {
      title: "Save it",
      narration: "Save it to your account — and if it'd help someone else, flip one toggle to share it.",
      action: async (page) => {
        await page.getByRole("button", { name: /save to account/i }).click();
        await expect(page.getByRole("heading", { name: /success/i })).toBeVisible({ timeout: 30_000 });
      },
    },
    {
      title: "Your sets, sorted by what's due",
      narration: "All your sets live in one place, sorted by what's due for review. Hit Study.",
      action: async (page) => {
        await page.goto("/flashcards");
        await expect(page.getByRole("heading", { name: /my flashcards/i })).toBeVisible();
        await page.getByRole("button", { name: /^study$/i }).first().click();
      },
    },
    {
      title: "Pick your path",
      narration:
        "Pick your direction and mode — classic flip cards, or AI-generated multiple choice — and begin.",
      action: async (page) => {
        await page.getByText(/front\s*→\s*back/i).first().click();
        await page.getByText(/^classic$/i).first().click();
        await page.getByRole("button", { name: /begin study session/i }).click();
      },
    },
    {
      title: "Rate your confidence",
      narration:
        "Before you see the answer, you rate how confident you feel. That honesty is data — it feeds your review schedule.",
      action: async (page) => {
        await expect(page.getByText(/rate your confidence/i)).toBeVisible();
        await page.getByRole("button", { name: /somewhat confident/i }).click();
      },
    },
    {
      title: "Flip, then be honest",
      narration:
        "Flip, check yourself, and be honest — right or wrong. The app schedules your reviews around what you actually know, not what you hope you know.",
      action: async (page) => {
        await page.getByText(/click card to reveal|click to flip/i).first().click();
        await page.getByRole("button", { name: /got it right/i }).click();
      },
    },
    {
      title: "The honest picture",
      narration:
        "At the end you get the honest picture: accuracy, misses, and when these cards come due again. Come back tomorrow and it tells you exactly what's due. That's spaced repetition doing the remembering for you.",
      action: async (page) => {
        // End the session from the in-session chrome; land on whatever summary the app shows.
        await page.getByText(/^end$/i).first().click();
        await expect(page.getByText(/session complete|results|accuracy/i).first()).toBeVisible({
          timeout: 30_000,
        });
      },
    },
  ],
);
