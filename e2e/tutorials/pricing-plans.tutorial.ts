import { expect } from "@playwright/test";
import { defineTutorial } from "./tutorial";

// Quick-reference clip for the help article "Subscription Plans" (slug subscription-plans,
// category billing). Captions only — no narration audio (witus plans/33 §4 decision 4).
//
// Selectors come from app/(public)/pricing/page.tsx: the Free Account summary block, the `tiers`
// array (Monthly Pro, Lifetime Learner, Annual Pro), the Developer API section, and the FAQ,
// which is a list of native <details>/<summary> elements.
//
// ONLY TWO PAID CARDS RENDER AT ONCE (pricing/page.tsx:231-240): while founder spots remain,
// Lifetime Learner shows and Annual Pro is hidden; once /api/pricing/founders reports them gone,
// they swap. Step 4 therefore accepts either card rather than naming one — that is the page's
// behaviour, not a loose assertion.
//
// THE ARTICLE AND THE PAGE DISAGREE (witus plans/33 §5.2 — the spec follows the app):
//   * The article names "Pro ($10/month)" and "Lifetime ($100 one-time)". The page sells Monthly
//     Pro at $10.60/month and Lifetime Learner at $103.29 one-time (processing fees included),
//     with Annual Pro at $103.29/year behind the founder-spots switch.
//   * The article says the Free tier can "Create unlimited flashcard sets" and "Study with all
//     three modes". The Free Account block caps AI generation at 3 sets per 30 days and lists
//     "Classic study mode" only; unlimited CSV imports are listed separately.
//   * The article's Pro list (extended challenge expiry, priority support, higher API rate
//     limits) is not the page's Pro list.
//   * The article says to manage a plan from Settings → Subscription. app/(dashboard)/settings has
//     no subscription section; the plan is shown on /profile, and the billing-portal link lives on
//     this page for signed-in paying accounts.
// The captions below describe the page. Fixing the article is a separate pass.
//
// SIDE EFFECTS: none, and deliberately so. No tier call to action, Cash App control or billing
// portal link is clicked — those start a real payment. Signed out, so the "Manage your
// subscription & billing" control does not render at all.

defineTutorial(
  {
    slug: "pricing-plans",
    title: "What the plans include",
    startPath: "/pricing",
  },
  [
    {
      title: "The plans page",
      narration: "Every plan and price lives on one public page: /pricing.",
      action: async (page) => {
        await expect(
          page.getByRole("heading", { name: /choose your\s+learning plan/i, level: 1 }),
        ).toBeVisible();
      },
    },
    {
      title: "What a free account gets",
      narration:
        "A free account gets three AI-generated sets every thirty days, unlimited CSV imports, classic study mode, and can join versus challenges.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Free Account" })).toBeVisible();
        await expect(page.getByText(/3 AI-generated sets per 30 days/i)).toBeVisible();
        await expect(page.getByText("Classic study mode")).toBeVisible();
      },
    },
    {
      title: "Monthly Pro",
      narration:
        "Monthly Pro is ten dollars sixty a month: five AI-generated sets every thirty days, every study mode, and generation from PDFs, YouTube, audio and images.",
      action: async (page) => {
        await expect(page.getByRole("heading", { name: "Monthly Pro" })).toBeVisible();
        await expect(page.getByText("$10.60", { exact: true })).toBeVisible();
        await expect(page.getByText("5 AI-generated sets per 30 days")).toBeVisible();
      },
    },
    {
      title: "Pay once, or pay yearly",
      narration:
        "Beside it sits Lifetime Learner at a hundred and three twenty-nine while founder spots last. Once they are gone the page offers Annual Pro at the same price per year instead.",
      action: async (page) => {
        // Exactly one of the two renders — see the header note on the founder-spots switch.
        await expect(
          page.getByRole("heading", { name: /lifetime learner|annual pro/i }),
        ).toBeVisible();
        await expect(page.getByText("$103.29", { exact: true })).toBeVisible();
      },
    },
    {
      title: "What counts against the AI cap",
      narration:
        "One generation is one set against the cap whether or not you add instructions, and CSV imports are never counted.",
      action: async (page) => {
        await page.getByText("Does adding instructions count as extra generations?").click();
        await expect(page.getByText(/csv imports are unlimited and never counted/i)).toBeVisible();
      },
    },
    {
      title: "The developer API is priced separately",
      narration:
        "The public API has its own tiers further down the page, starting free with a hundred generations and a thousand calls a month.",
      action: async (page) => {
        await expect(
          page.getByRole("heading", { name: /build with the flashlearnai\.witus\.online api/i }),
        ).toBeVisible();
      },
    },
  ],
);
