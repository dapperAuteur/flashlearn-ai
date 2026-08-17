import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// "Feedback that never falls through the cracks" — the USER half of Tutorial C from witus
// plans/31 (steps 1–5, narration verbatim; BAM records one audio file per step). The OPERATOR
// half (steps 6–10, the WitUS Inbox side) is a separate spec in the witus-inbox repo. Selectors
// come from components/ui/FeedbackWidget.tsx (mounted app-wide for authenticated users via
// app/ClientRoot.tsx).
//
// RECORDING NOTES: needs a signed-in session via TUTORIAL_STORAGE_STATE (see
// playwright.tutorial.config.ts header); without it this spec SKIPS. The recording creates a
// REAL conversation that mirrors into the production WitUS Inbox and pushes to the triage
// agent — that's intentional: it doubles as the plan-30 acceptance-test traffic for the
// feedback→Inbox pipeline. Two guards keep it identifiable and harmless:
//   1. The Subject starts with "[TUTORIAL] " so BAM can spot (and clean up) tutorial traffic
//      in the Inbox at a glance.
//   2. The category is General, NOT Bug — plans/31 step 4 films it as a Bug, but a Bug
//      submission triggers an automatic high-priority SMS to BAM's phone. The narration line
//      ("Bugs get flagged high-priority automatically") stays verbatim; only the on-screen
//      category diverges. Re-film as Bug deliberately if BAM wants the SMS on camera.

const SUBJECT = "[TUTORIAL] Trying the feedback thread";
const MESSAGE =
  "This is a tutorial recording exercising the feedback widget end to end — no action needed.";

defineTutorial(
  {
    slug: "feedback-user",
    title: "Feedback that never falls through the cracks",
    startPath: "/dashboard",
    requiresAuth: true,
  },
  [
    {
      title: "A direct line, on every page",
      narration:
        "Every WitUS app has a direct line to a human — me. In FlashLearnAI it's this button, on every page.",
      action: async (page) => {
        // aria-label is "Open feedback" (or "Open feedback - new messages" with unreads).
        await expect(
          page.getByRole("button", { name: /open feedback/i }),
        ).toBeVisible();
      },
    },
    {
      title: "Open it",
      narration:
        "Open it and start a conversation. Not a black-hole contact form — an actual thread.",
      action: async (page) => {
        await page.getByRole("button", { name: /open feedback/i }).click();
        await expect(page.getByText("Help & Feedback")).toBeVisible();
      },
    },
    {
      title: "Say what kind of message it is",
      narration:
        "Tell me what kind of message it is — found a bug, want a feature — add a subject and the details. Screenshots welcome; you can attach images or a short video.",
      action: async (page) => {
        await page.getByRole("button", { name: "New Conversation" }).click();
        // General, not Bug — see the recording notes at the top of this file.
        await page.getByRole("button", { name: /^general$/i }).click();
        await page.getByPlaceholder("Brief description...").fill(SUBJECT);
        await page.getByPlaceholder("Describe in detail...").fill(MESSAGE);
      },
    },
    {
      title: "Send",
      narration: "Bugs get flagged high-priority automatically. Send.",
      action: async (page) => {
        await page.getByRole("button", { name: /^send$/i }).click();
      },
    },
    {
      title: "A live thread, not a ticket",
      narration:
        "Your message becomes a live thread you can add to any time — and here's what happens on my side.",
      action: async (page) => {
        // On success the widget flips to the thread view: subject in the header, green
        // "open" status pill, the message as a bubble, reply box below.
        const panel = page.getByRole("dialog", { name: "Help and feedback" });
        await expect(panel.getByText(SUBJECT).first()).toBeVisible({ timeout: 30_000 });
        await expect(panel.getByText("open", { exact: true })).toBeVisible();
      },
    },
  ],
);
