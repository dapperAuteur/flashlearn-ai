## ⚠️ Ecosystem repo identity (don't confuse these)

When wiring outbox triggers in this repo, fetch and follow https://raw.githubusercontent.com/dapperAuteur/witus-outbox/main/examples/INTEGRATE.md and the per-app recipe at https://raw.githubusercontent.com/dapperAuteur/witus-outbox/main/examples/triggers/witus-online.md.

For ecosystem branding (favicons, logos, ecosystem footer with Rise Wellness), see https://raw.githubusercontent.com/dapperAuteur/witus-online/main/public/brand/README.md and the footer recipe at https://raw.githubusercontent.com/dapperAuteur/witus-online/main/public/brand/footer-recipe.md. The witus repo is the canonical home — update there first when ecosystem branding changes, then absorb into this repo on next touch.

## Docs and a video script ship with every bundle

Extends the shared docs-sync rule below. Kept OUTSIDE the managed block on purpose: that block is overwritten by a sync from `gemini/witus/docs/shared-rules.md`, so a rule written into it by hand disappears on the next sync. If this should apply across the ecosystem, add it to that source instead and let the sync bring it back here.

**Trigger:** completing a bundle, or a branch when no bundle is created. Not per commit.

Before handing a branch back, work the whole list and say in the handoff which items you touched and
which you deliberately skipped, with the reason:

1. **README** — feature list, env examples, scripts, counts. A number in the README that no longer
   matches the code is a bug, not a cosmetic issue.
2. **Public docs** — `app/(public)/docs/api/**`, the OpenAPI spec, the roadmap page, the changelog.
   Never leave an aspirational ✅ on the roadmap; downgrade it with a one-line reason.
3. **In-app help** — the seeded articles in `app/api/admin/help/seed/route.ts`. Note that changing a
   seed does NOT remove an article already published to the help database, so say so in the handoff
   when an article needs deleting by hand.
4. **Tutorials** — `docs/tutorials/`, plus a spec under `e2e/tutorials/` where the flow is worth
   recording as a test.
5. **A video tutorial script** for any user-visible feature the bundle adds or changes. See below.

**The video script.** BAM records these, so the script is written for someone at the keyboard, not
for a reader. It goes in `docs/tutorials/scripts/NN-slug.md` and contains:

- **What the viewer will be able to do** by the end, in one sentence.
- **Setup** — the exact account state needed before recording. Signed in as what role, what data
  must already exist, what must NOT exist. This is the part that wastes a take when it is missing.
- **Numbered beats.** Each beat has three parts, and all three are required:
  - **On screen:** what is visible, where the cursor goes, what gets clicked or typed. Name real UI
    text, not paraphrases, so the script and the app can be diffed.
  - **Say:** the narration, written to be read aloud rather than scanned.
  - **Why it matters:** one line on what the viewer should take away. Cut the beat if there is no
    answer.
- **What to be careful of** — anything that produces real side effects while recording (a real
  social draft, a real email, a consumed AI generation), and anything that looks broken but is not.
- **A YouTube embed placeholder** so the article ships text-first and gains its video later:
  `{{video:PENDING}}`, swapped for the id once published. Never block a doc on a recording.

Open the script with the mental model, not the click path, wherever getting the model wrong is
costly. A viewer who does not understand that proctored study writes to a *student's* account will
misuse it no matter how well the buttons are labelled.

---

<!-- BEGIN:witus-shared-rules v1 -->
<!-- MANAGED BLOCK — do not edit by hand. Source: gemini/witus/docs/shared-rules.md.
     Update the source, then run `node scripts/sync-claude-rules.mjs` in the witus repo. -->

## ⚠️ Ecosystem identity (shared note — don't confuse repos)

Full ecosystem identity + the canonical product index live in `gemini/witus/CLAUDE.md` and
`gemini/witus/lib/products.ts`. Each repo states *which* product it is in its own hand-owned line
above this managed block; don't infer another app's URLs, routes, IDs, env names, or DB schema —
confirm against that app's own code.

The site **brandanthonymcdonald.com** (BAM's personal portfolio) lives in `claude/bam-landing-page/`
— **NOT** `projects/bam-portfolio/` (the retired legacy static site). Target `bam-landing-page`.

## Operator-task rule — capture user actions in `./plans/user-tasks/`

When Claude proposes work that needs BAM to do something outside the editor (account signup, API
key, DNS change, vendor dashboard, env-var rotation, secret generation, PR review/merge, etc.),
Claude MUST create a `./plans/user-tasks/NN-slug.md` file in this repo. **No exceptions for "small"
steps.** Required sections: **Scope tag** · **What + why** (with explicit *what this blocks* detail
and any hard deadline) · **Steps** · **What Claude will use** · **How to mark done** · **Related**.
Keep `./plans/user-tasks/00-descriptions.md` updated with columns `# | Title | Scope | Blocks |
Status` — the `Blocks` column is the one BAM scans. Ecosystem-wide tasks (Keap, IRL events, retros,
cross-product decisions) live in the canonical witus queue at `gemini/witus/plans/user-tasks/`;
repo-local tasks live here. Read the witus queue at session start before dependent work. Full rule:
`gemini/witus/CLAUDE.md` §"Operator-task rule".

## Branch hygiene — BAM merges, between sessions by default

**Half 1.** Branch → commit → push → stop. Claude does not run `git checkout main && git merge`.
Never `--force` to shared branches. Before every commit run `git branch --show-current`; if it is
`main`/`master`, branch first (`feat/ fix/ chore/ docs/`). After push, hand back the branch name +
summary and stop.

**Half 2.** BAM merges pushed branches via the GitHub UI between sessions. Mid-session, after a
push, BAM may merge in a separate window and the local checkout silently fast-forwards to `main` —
so re-check `git branch --show-current` before **every** commit, not just at branch creation, or you
risk landing follow-up commits directly on `main`.

**Half 3.** Keep branches small (one concern each). When a session produces multiple branches,
consolidate them into one `bundle/<slug>-YYYY-MM-DD` via `git merge --no-ff` (preserves per-concern
history — no squash), resolve conflicts during bundling, run `tsc + lint + build` against the
bundle, push, and file ONE `./plans/user-tasks/NN-merge-bundle-<slug>.md`. BAM does one merge, not N.

**Commit often.** Commit at every working checkpoint — a passing build, a finished sub-step, a green
test — not just at the end. A usage-limit cutoff, a dropped connection, or a crashed session must
never lose more than the last few minutes of work. Small frequent commits on the feature branch keep
the branch un-merged (Half 1 still holds) and give BAM clean per-step history to drill into.

A checked-in `.githooks/pre-commit` guard refuses commits made directly on `main`/`master`. Activate
once per clone: `git config core.hooksPath .githooks`. Full rule: `gemini/witus/CLAUDE.md`
§"Branch-hygiene rule".

## Docs-sync rule — a change isn't done until its docs are current

When a change adds, alters, or removes a user-visible feature/route/scope, update the affected docs
**in the same branch**: README (feature list, env examples, scripts), in-app help/tutorial content,
`ROADMAP.md` **and** any public roadmap page, API/OpenAPI docs, and STYLE_GUIDE/CONTRIBUTING when a
convention changed. State which docs you touched in the handoff. Never leave an aspirational ✅ on a
roadmap — downgrade it with a one-line reason. If a doc update is genuinely out of scope, file it as
a `./plans/` task rather than skipping silently. A Stop hook in `.claude/settings.json` gates on
this: if the session diff changed feature/route files but touched no docs, it blocks once and asks
you to update-or-defer. Schema-only migrations, refactors, perf, and dev-tooling changes don't
trigger it.

## Plans convention

All implementation plans live in `./plans/` as `NN-description-of-plan.md` (two-digit prefix,
kebab-case, next available number, don't skip). Sub-queues: `./plans/user-tasks/NN-slug.md`
(operator tasks), `./plans/bugs/`, `./plans/future/`. (`plans/` is typically gitignored.)

## Citation rule

Anything publishable, teachable, or partner-facing (curriculum, teaching-oriented help articles,
white papers, grant/sponsor/partner writing) uses APA 7 in-line citations with a `## References`
section. Code docs, internal notes, and `plans/user-tasks/*` are out of scope. Full rule:
`gemini/witus/CLAUDE.md` §"Citation rule".

## Authoritative-values rule — never assert guessed external values

When a value is owned by an external system (DNS/registrar, a host like Vercel, a third-party API,
or another ecosystem app's URLs/routes/IDs/env/schema), read it from the authoritative source; don't
hardcode a guessed default and present it as correct. If you must ship a fallback, label it as a
fallback in both UI copy and a code comment. Verify by behavior (does the flow work?), not by
exact-match against a guess. When unsure, flag or ask — never assert. Full rule:
`gemini/witus/CLAUDE.md` §"Authoritative-values rule".

## Coding conventions

UI/UX/DX conventions (a11y, component patterns, TypeScript, microcopy, git-commit vocabulary, the
default Neon+Drizzle+pnpm+Vitest stack) are consolidated in `gemini/witus/docs/shared-ui-ux-dx.md`.
Read it before writing UI or API code. Two repos are grandfathered on Supabase+Jest and documented
there as exceptions.

<!-- END:witus-shared-rules v1 -->
