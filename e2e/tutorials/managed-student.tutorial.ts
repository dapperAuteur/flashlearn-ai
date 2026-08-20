import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// "Add a student who has no email address" — the recorded companion to
// docs/tutorials/scripts/03-add-a-student-without-an-email.md. Narration is kept
// close to that script so the two can be diffed; when the UI copy moves, this
// spec fails and the script gets corrected rather than quietly rotting.
//
// RECORDING NOTES: needs a signed-in TEACHER account (TUTORIAL_STORAGE_STATE, see
// playwright.tutorial.config.ts) that already teaches at least one classroom that
// is NOT archived. Without the storage state this spec SKIPS.
//
// SIDE EFFECT: every run creates a real managed student account on whatever
// environment it points at, and mints a real claim code for it. The last step
// removes the student from the roster, which unenrols but deliberately does not
// delete the account, so repeated runs leave accounts behind. Point this at a
// preview deployment, not production, unless you mean to.

const STUDENT_NAME = "Tutorial Student";

defineTutorial(
  {
    slug: "managed-student",
    title: "Add a student who has no email address",
    startPath: "/teacher",
    requiresAuth: true,
  },
  [
    {
      title: "Start from your classrooms",
      narration:
        "A student with no email address, no device, and no signup can still study with you. Here is how you set that up, from your own account.",
      action: async (page) => {
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      },
    },
    {
      title: "Open the roster",
      narration:
        "Every classroom you teach has a roster. This is where the students in the room live.",
      action: async (page) => {
        await page.getByRole("link", { name: /roster/i }).first().click();
        await expect(page.getByLabel(/add a student/i)).toBeVisible();
      },
    },
    {
      title: "A name is all you need",
      narration:
        "One field. A name is all you type, and all we store. There is no email address to collect and no password to invent.",
      action: async (page) => {
        await page.getByLabel(/add a student/i).fill(STUDENT_NAME);
      },
    },
    {
      title: "The claim code shows once",
      narration:
        "Here is the part to slow down for. This code is how the student takes ownership of the account later, and it is shown exactly once. Write it down now.",
      action: async (page) => {
        await page.getByRole("button", { name: /^add student$/i }).click();
        // The dialog is the assertion: if it stopped appearing, the code would be
        // minted and lost, which is the one failure this flow cannot recover from.
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole("heading", { name: /claim code for/i })).toBeVisible();
      },
    },
    {
      title: "Say what it is out loud",
      narration:
        "It is a working credential, so treat it like one. It lasts ninety days, and if it goes missing you can issue a new one, which retires the old.",
      action: async (page) => {
        await expect(
          page.getByRole("button", { name: /i have written the code down/i }),
        ).toBeFocused();
      },
    },
    {
      title: "Dismissing is deliberate",
      narration:
        "There is no way to click away from this by accident. The only exit is saying you have the code.",
      action: async (page) => {
        await page.getByRole("button", { name: /i have written the code down/i }).click();
        await expect(page.getByRole("dialog")).toBeHidden();
      },
    },
    {
      title: "What the roster now says",
      narration:
        "The student is on the roster, marked as an account you made, with no email address against their name.",
      action: async (page) => {
        await expect(page.getByText(STUDENT_NAME).first()).toBeVisible();
      },
    },
    {
      title: "Study with them from here",
      narration:
        "Start session is the whole point. It takes you into study with their account already chosen, so what they get right and wrong lands on their record and their review schedule, not yours.",
      action: async (page) => {
        const row = page.locator("li", { hasText: STUDENT_NAME }).first();
        await row.getByRole("link", { name: /start session/i }).click();
        // The banner naming the student is what tells a teacher mid-lesson whose
        // account they are about to write to. Losing it is how work goes to the
        // wrong person silently.
        await expect(page.getByText(new RegExp(STUDENT_NAME, "i")).first()).toBeVisible();
      },
    },
    {
      title: "Tidy up",
      narration:
        "Removing a student takes them off this roster. Their account and everything they have studied stay where they are.",
      action: async (page) => {
        await page.goBack();
        const row = page.locator("li", { hasText: STUDENT_NAME }).first();
        await row.getByRole("button", { name: /^remove/i }).click();
        await row.getByRole("button", { name: /confirm remove/i }).click();
        await expect(page.getByText(STUDENT_NAME)).toHaveCount(0);
      },
    },
  ],
);
