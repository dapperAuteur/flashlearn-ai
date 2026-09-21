import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// Quick-reference clip for the help article "Studying Offline" (slug offline-mode, category
// offline — note a second published article, studying-offline, carries the same title).
// Captions only — no narration audio (witus plans/33 §4 decision 4).
//
// Selectors come from components/ui/OfflineIndicator.tsx, mounted app-wide in app/ClientRoot.tsx
// so it shows for signed-out visitors too. It reads isOnline/isSyncing/pendingCount from
// contexts/NetworkSyncContext.tsx, which tracks the browser's own online and offline events —
// which is why page.context().setOffline() is enough to make the bar appear.
//
// WHAT IS NOT FILMED: the article also describes a blue "Syncing N of M items..." bar and a green
// all-synced toast. Both need queued writes from a signed-in session, so they are out of scope
// for a signed-out clip. The amber bar is the one a viewer needs to recognise.
//
// SIDE EFFECTS: none. The last step puts the context back online so the recording does not leave
// the browser offline for whatever runs next.

defineTutorial(
  {
    slug: "offline-indicator",
    title: "The bar that tells you the connection dropped",
    startPath: "/explore",
  },
  [
    {
      title: "Start online",
      narration: "Explore, with a normal connection. Nothing is pinned to the bottom of the screen.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Explore Flashcard Sets", level: 1 })).toBeVisible();
        await expect(page.getByText(/you're offline — progress saved locally/i)).toBeHidden();
      },
    },
    {
      title: "Lose the connection",
      narration:
        "The moment the connection goes, an amber bar slides up across the bottom of every page.",
      action: async (page) => {
        await page.context().setOffline(true);
        await expect(page.getByText(/you're offline — progress saved locally/i)).toBeVisible();
      },
    },
    {
      title: "It says where your work went",
      narration:
        "Progress saved locally is the important half: answers are written to this device and wait there.",
      action: async (page) => {
        // role="status" with aria-live="polite" — a screen reader is told without stealing focus.
        await expect(page.getByRole("status").filter({ hasText: /progress saved locally/i })).toBeVisible();
      },
    },
    {
      title: "Reconnect and it goes away",
      narration:
        "Back online, the bar retracts on its own. Anything waiting on the device uploads without you asking.",
      action: async (page) => {
        await page.context().setOffline(false);
        await expect(page.getByText(/you're offline — progress saved locally/i)).toBeHidden();
      },
    },
  ],
);
