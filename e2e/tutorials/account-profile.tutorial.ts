import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// Quick-reference clip for the help article "Managing Your Account" (slug managing-your-account,
// category account). Captions only — no narration audio (witus plans/33 §4 decision 4).
//
// Selectors come from app/(dashboard)/profile/page.tsx: the "Your Profile" heading, the account
// summary list (Username, Subscription plan), the "Update Profile" form with its name/username
// fields and the disabled email box with its "Change" control, and the "Change Password" panel.
//
// THE ARTICLE AND THE APP DISAGREE (witus plans/33 §5.2 — the spec follows the app):
//   * The article puts "Change your email or password", "View your subscription status" and
//     "Export your data" under Settings. /settings has none of those: it holds study preferences,
//     notifications, the milestone-sharing switch and account deletion. Email, password and the
//     subscription plan are on /profile, and export is its own page at /flashcards/export.
//   * The article says you can "Write a bio and add study interests" and "Control privacy: public
//     or followers-only activity feed". The profile page has no bio field, no interests field and
//     no privacy control; `bio` exists on the User model (models/User.ts:152) with no UI behind
//     it. Those captions are not in this clip because the app cannot do them.
// The captions below describe the app. Fixing the article is a separate pass.
//
// AUTH: requires a signed-in session via TUTORIAL_STORAGE_STATE. Skips without it.
//
// SIDE EFFECTS: none. Every panel is opened and nothing is submitted: no name change, no username
// change, no email change (which sends a verification email to a real address), no password
// change (which would lock the recording account out of its own storage state), and the Danger
// Zone on /settings is not visited at all.

defineTutorial(
  {
    slug: "account-profile",
    title: "Where your account settings live",
    startPath: "/profile",
    requiresAuth: true,
  },
  [
    {
      title: "Your Profile",
      narration:
        "Your account lives at /profile: who you are, what plan you are on, and the two credentials you can change.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Your Profile", level: 1 })).toBeVisible();
      },
    },
    {
      title: "Your plan is stated here",
      narration:
        "Subscription plan tells you which tier the account is on. There is no subscription section on the Settings page.",
      action: async (page) => {
        await expect(page.getByText("Subscription plan")).toBeVisible();
      },
    },
    {
      title: "Your username is your leaderboard name",
      narration:
        "Update Profile is where the display name and username live. The username is what leaderboards show: lowercase letters, numbers, underscores and hyphens.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Update Profile" })).toBeVisible();
        await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
        await expect(page.getByText(/used on leaderboards/i)).toBeVisible();
      },
    },
    {
      title: "Changing your email takes your password",
      narration:
        "The email box is read-only until you press Change. Then it asks for the new address and your current password, and mails the new address to verify it.",
      action: async (page) => {
        await page.getByRole("button", { name: "Change" }).first().click();
        await expect(page.getByLabel("New Email Address")).toBeVisible();
        await expect(page.getByLabel("Confirm Password")).toBeVisible();
        // Deliberately not filled or submitted: that sends a real verification email.
      },
    },
    {
      title: "Changing your password",
      narration:
        "Change Password is its own panel further down, and a new password has to be at least twelve characters.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Change Password" })).toBeVisible();
      },
    },
    {
      title: "Study preferences are elsewhere",
      narration:
        "Study defaults, reminders, milestone sharing and account deletion are on the Settings page instead.",
      action: async (page) => {
        await page.goto("/settings");
        await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Study Preferences" })).toBeVisible();
      },
    },
  ],
);
