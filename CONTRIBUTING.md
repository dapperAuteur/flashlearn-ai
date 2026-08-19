# Contributing to FlashLearn AI

This repository is proprietary (see [LICENSE](./LICENSE)). These notes are for the people who
already have commit access, so that everyone works the same way.

## Run it locally

```bash
git clone https://github.com/dapperAuteur/flashlearn-ai.git
cd flashlearn-ai
cp .env.sample .env.local   # then fill in the values
npm install
npm run dev                 # http://localhost:3000
```

CI runs on Node 22. `.env.sample` is annotated; `README.md` lists the minimum set of variables
needed to boot. AI routes, Stripe, and email each fail loudly without their keys, so expect those
surfaces to be dark until you supply them.

Turn on the shared git hooks once per clone:

```bash
git config core.hooksPath .githooks
```

The only hook today is a `pre-commit` guard that refuses commits made directly on `main`.

## The gates

Two workflows run in `.github/workflows/`:

| Workflow | Trigger | What it runs |
|---|---|---|
| `test.yml` | every push and pull request, every branch | `npx tsc --noEmit`, then `npm test` (Jest) |
| `e2e.yml` | `deployment_status` from Vercel | Playwright plus axe accessibility checks against the deployed URL |

Run the same two commands before you push:

```bash
npx tsc --noEmit
npm test
```

`test.yml` needs no secrets and no database; the suite mocks its data layer. `e2e.yml` only fires
after Vercel finishes a deploy, and its workflow file is read from `main`, so changes to it take
effect after they merge.

## Branches and commits

Branch off `main` with a type prefix that matches the work:

```
feat/short-slug     fix/short-slug     chore/short-slug
docs/short-slug     refactor/short-slug
```

Keep one concern per branch. When a session produces several, merge them into a
`bundle/<slug>-YYYY-MM-DD` branch with `git merge --no-ff` so the per-concern history survives, then
run the gates against the bundle.

Commit messages follow `type(scope): summary`, lowercase, present tense, describing the effect
rather than the diff. Real examples from the log:

```
feat(sets): one-to-five-star ratings on public sets
fix(study): stop next-card answer leak by colocating isFlipped in StudyCard
refactor(seed): extract card merge so it can be tested
ci: run tsc and jest on every push, and make the suite green
```

Commit at every working checkpoint rather than once at the end. Push the branch and open a pull
request. BAM merges; do not merge your own branch into `main`, and never force-push a shared branch.

## Docs move with the code

A change is not finished until the docs that describe it are current, in the same branch. If your
change adds, alters, or removes a user-visible feature, route, or scope, update whichever of these
it touched:

- `README.md` (feature list, environment examples, scripts)
- the in-app help and tutorial content
- `app/(public)/roadmap/page.tsx` and `app/(public)/changelog/page.tsx`
- the API reference under `app/(public)/docs/api/` and the OpenAPI spec in `lib/api/openapi.ts`

Say in the pull request which docs you touched. Never leave a roadmap item marked complete when it
is not; downgrade it with a one-line reason instead. Schema-only migrations, refactors, performance
work, and dev tooling do not trigger this.

## Writing style

Product copy, docs, comments, and commit messages avoid em dashes and the usual machine-written
vocabulary. Write the plain version of the sentence.
