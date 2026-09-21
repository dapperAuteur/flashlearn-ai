import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// Quick-reference clip for the help article "Studying Offline" (slug studying-offline, category
// offline). Captions only — no narration audio (witus plans/33 §4 decision 4).
//
// Selectors come from app/offline/page.tsx, the fallback the service worker serves when a
// navigation fails with no connection. Its `cachedRoutes` list is the authoritative answer to
// "what still works offline": My Flashcards and Study, and nothing else. The comment above that
// array says the other precached routes render their shell but fetch every figure from the
// server, which is why they are not offered here.
//
// SIDE EFFECTS: none. Signed out, read only. The page is visited directly rather than by dropping
// the connection, so nothing is queued and nothing syncs. The companion clip
// offline-indicator.tutorial.ts films the status bar that appears when the connection actually
// goes away.

defineTutorial(
  {
    slug: "offline-basics",
    title: "What still works with no connection",
    startPath: "/offline",
  },
  [
    {
      title: "The offline page",
      narration:
        "When a page cannot load without a connection, FlashLearnAI shows this instead of a browser error.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "You're Offline", level: 1 })).toBeVisible();
      },
    },
    {
      title: "Your results are not lost",
      narration:
        "Sets already saved on this device stay studyable, and results are written here and uploaded on their own once you are back online.",
      action: async (page) => {
        await expect(
          page.getByText(/your results are saved here and upload on their own once you are back online/i),
        ).toBeVisible();
      },
    },
    {
      title: "Two pages work offline",
      narration:
        "My Flashcards and Study are the two pages that read from the copy on your device, so those are the two offered here.",
      action: async (page) => {
        const nav = page.getByRole("navigation", { name: "Available offline pages" });
        await expect(nav.getByRole("link", { name: "My Flashcards" })).toBeVisible();
        await expect(nav.getByRole("link", { name: "Study" })).toBeVisible();
      },
    },
    {
      title: "What needs a connection",
      narration:
        "Your dashboard, your study history, and anything that generates or shares a set need a connection.",
      action: async (page) => {
        await expect(
          page.getByText(/your dashboard, study history, and anything that generates or shares a set need a connection/i),
        ).toBeVisible();
      },
    },
  ],
);
