import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";
import { warmStart } from "./_helpers";

// Quick-reference clip for the help article "What Is FlashLearnAI?" (slug what-is-flashlearnai,
// category getting-started). Captions only — no narration audio (witus plans/33 §4 decision 4).
//
// Selectors come from app/(public)/help/page.tsx (the "Help Center" heading, the nav labelled
// "Help categories", the article cards) and app/(public)/help/[slug]/page.tsx (the "Back to Help
// Center" link, the category pill, the "Related Articles" rail).
//
// SIDE EFFECTS: none. Signed out, read only, no form is submitted. The article page mounts
// components/help/HelpArticleFeedback.tsx, which POSTs a helpful/not-helpful vote — this spec
// never clicks it.
//
// KNOWN DEFECT THIS CLIP WILL SHOW ON CAMERA: article bodies are authored as Markdown in
// app/api/admin/help/seed/route.ts but injected as HTML by app/(public)/help/[slug]/page.tsx:127
// (dangerouslySetInnerHTML), with no Markdown-to-HTML step anywhere in between. Readers therefore
// see literal "##" and "**bold**" in the body, and the body has no real headings — which is why
// step 5 below asserts on text rather than on a heading role. Worth fixing before this is
// recorded; the captions avoid promising structure the page does not render.
//
// NOTE FOR THE RECORDER: the article list is served from MongoDB, not from a file, so the card
// count in the category nav reflects whatever is published at record time.

defineTutorial(
  {
    slug: "help-center",
    title: "Find an answer in the Help Center",
    startPath: "/help",
  },
  [
    {
      title: "Open the Help Center",
      narration: "Every FlashLearnAI page footer leads here: the Help Center at /help.",
      action: async (page) => {
        await warmStart(page, "/help");
        await expect(page.getByRole("heading", { name: "Help Center", level: 1 })).toBeVisible();
      },
    },
    {
      title: "Articles are grouped by category",
      narration:
        "Articles are grouped into eight categories. The number beside a category is how many articles it holds.",
      action: async (page) => {
        const nav = page.getByRole("navigation", { name: "Help categories" });
        await expect(nav.getByRole("link", { name: /getting started/i })).toBeVisible();
        await expect(nav.getByRole("link", { name: /^versus/i })).toBeVisible();
      },
    },
    {
      title: "Jump to a category",
      narration: "Click a category to jump to its section further down the page.",
      action: async (page) => {
        await page.getByRole("navigation", { name: "Help categories" })
          .getByRole("link", { name: /getting started/i })
          .click();
        await expect(page.getByRole("heading", { name: "Getting Started", level: 2 })).toBeVisible();
      },
    },
    {
      title: "Open the overview article",
      narration:
        "Each card shows the article title and a one-line summary. Open What Is FlashLearnAI for the tour of the whole app.",
      action: async (page) => {
        await page.getByRole("link", { name: /what is flashlearnai/i }).first().click();
        await expect(
          page.getByRole("heading", { name: /what is flashlearnai/i, level: 1 }),
        ).toBeVisible();
      },
    },
    {
      title: "What the article covers",
      narration:
        "This one lists the key features: AI generation, spaced repetition, study modes, versus mode, offline support, teams and classrooms, and the public API.",
      action: async (page) => {
        await expect(page.getByText("Key Features").first()).toBeVisible();
        await expect(page.getByText(/spaced repetition/i).first()).toBeVisible();
      },
    },
    {
      title: "Keep reading, or go back",
      narration:
        "Related Articles on the right lists the rest of that category, and Back to Help Center returns you to the full list.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Related Articles" })).toBeVisible();
        await page.getByRole("link", { name: "Back to Help Center" }).click();
        await expect(page.getByRole("heading", { name: "Help Center", level: 1 })).toBeVisible();
      },
    },
  ],
);
