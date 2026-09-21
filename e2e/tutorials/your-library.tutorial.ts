import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// Quick-reference clip for the help article "Your Library: Keeping the Sets You Actually Study"
// (slug your-library, category getting-started). Captions only — no narration audio (witus
// plans/33 §4 decision 4).
//
// Selectors come from app/(public)/explore/page.tsx (the Study Now link and the library toggle
// beside it), components/library/LibraryToggleButton.tsx (the label flips between "Add to
// library" and "In your library", with aria-pressed carrying the same state) and
// components/library/LibraryPanel.tsx (the "Your Library" section at the top of /dashboard, its
// "Add more sets" link and its empty state).
//
// AUTH: requires a signed-in session via TUTORIAL_STORAGE_STATE (see
// playwright.tutorial.config.ts). Without it the spec SKIPS. The toggle is rendered only for
// signed-in visitors (explore/page.tsx:259 and :387) — the article does not say so, and a
// signed-out viewer of this clip will not find the button.
//
// SIDE EFFECTS: creates-data, on the recorder's OWN account only. Step 3 adds one public set to
// the signed-in learner's library (POST /api/library) and the last step removes that same set
// again (DELETE /api/library), matched by the title read off the card it clicked, so a set that
// was already on the shelf is never removed by accident. Nothing is shared, nothing is published,
// and no other user sees anything. If the run dies between those two steps, remove the set from
// /dashboard by hand.

/** Title of the set this run added, so the cleanup step removes that one and no other. */
let addedSetTitle = "";

defineTutorial(
  {
    slug: "your-library",
    title: "Keep the sets you actually study",
    startPath: "/explore",
    requiresAuth: true,
  },
  [
    {
      title: "Explore is the whole catalogue",
      narration:
        "Explore shows every public set, newest first. Your library is the short list you pull out of it.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Explore Flashcard Sets", level: 1 })).toBeVisible();
      },
    },
    {
      title: "Every card has a shelf button",
      narration:
        "Beside Study Now, each set carries Add to library. It appears once you are signed in, because a shelf needs an account.",
      action: async (page) => {
        await expect(page.getByRole("button", { name: "Add to library" }).first()).toBeVisible();
      },
    },
    {
      title: "Add one",
      narration:
        "Click it and the label flips to In your library. The set is not copied — your shelf points at the author's original, so their corrections reach you.",
      action: async (page) => {
        const toggle = page.getByRole("button", { name: "Add to library" }).first();
        // Nearest ancestor div that holds a heading is the set card; its h3 is the set title.
        const card = toggle.locator("xpath=ancestor::div[.//h3][1]");
        addedSetTitle = (await card.getByRole("heading", { level: 3 }).innerText()).trim();
        await toggle.click();
        await expect(card.getByRole("button", { name: "In your library" })).toBeVisible();
      },
    },
    {
      title: "It is waiting on your dashboard",
      narration:
        "Your Library is the first block on the dashboard, so the sets you use are what you see when you sign in.",
      action: async (page) => {
        await page.goto("/dashboard");
        await expect(page.getByRole("heading", { name: "Your Library", level: 2 })).toBeVisible();
        await expect(page.getByRole("link", { name: "Add more sets" })).toBeVisible();
      },
    },
    {
      title: "Sorted by what you actually study",
      narration:
        "The list is ordered by what you studied most recently, then by what you added most recently. You never sort it yourself.",
      action: async (page) => {
        const library = page.getByRole("region", { name: "Your Library" });
        await expect(library.getByRole("listitem").first()).toBeVisible();
      },
    },
    {
      title: "Taking one off keeps your progress",
      narration:
        "Click the button again to take a set off the shelf. Your streak, your accuracy and your review schedule for it are all kept.",
      action: async (page) => {
        await page.goto("/explore");
        const card = page
          .getByRole("heading", { level: 3, name: addedSetTitle })
          .first()
          .locator("xpath=ancestor::div[1]");
        await card.getByRole("button", { name: "In your library" }).click();
        await expect(card.getByRole("button", { name: "Add to library" })).toBeVisible();
      },
    },
  ],
);
