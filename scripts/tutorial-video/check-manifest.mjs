#!/usr/bin/env node
// Help-article coverage gate for tutorial recordings (witus plans/33 §4).
//
// Every help article the app publishes must be named in e2e/tutorials/manifest.json, either with a
// spec that records it or with a waiver saying why there is nothing to record. Run it with:
//   npm run tutorial:check            # day-to-day: "todo" entries are allowed
//   npm run tutorial:check -- --strict  # the launch gate: "todo" is a failure
//
// WHERE THE ARTICLE LIST COMES FROM. The /help pages read from MongoDB
// (app/(public)/help/page.tsx → HelpArticle), so there is no file the page itself renders. The
// source of truth in the repo is the seed at app/api/admin/help/seed/route.ts, which is what this
// script parses. Seeding is additive — it skips slugs that already exist and never deletes — so
// production can serve articles the seed no longer names. Those show up here as "manifest-only"
// entries: they are reported, not failed, because the script cannot prove from the repo whether an
// extra entry is stale or simply DB-authored. Check the live list with:
//   curl -s https://flashlearnai.witus.online/api/help | jq -r '.articles[].slug'

import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SEED_FILE = path.join(REPO_ROOT, "app", "api", "admin", "help", "seed", "route.ts");
const MANIFEST_FILE = path.join(REPO_ROOT, "e2e", "tutorials", "manifest.json");
const SPEC_DIR = path.join(REPO_ROOT, "e2e", "tutorials");

const STRICT = process.argv.includes("--strict");
const VALID_STATUS = ["recorded", "passes", "written-not-run", "blocked", "todo"];
const VALID_SIDE_EFFECTS = ["none", "creates-data", "sends-email", "spends-quota", "money"];
const VALID_KIND = ["lead", "quick-reference"];

const errors = [];
const warnings = [];
// Declared up here so the early-exit report() below cannot hit a temporal dead zone.
const specsNamed = new Set();
let manifestOnly = [];
let waivers = 0;

/** Slugs defined in the seed file's `seedArticles` array, in file order. */
function seedSlugs() {
  const src = readFileSync(SEED_FILE, "utf8");
  const start = src.indexOf("const seedArticles = [");
  if (start === -1) {
    errors.push(`Could not find "const seedArticles = [" in ${path.relative(REPO_ROOT, SEED_FILE)}.`);
    return [];
  }
  // The array ends at the first line that is exactly "];" — the closing bracket of the literal.
  const end = src.indexOf("\n];", start);
  const body = src.slice(start, end === -1 ? undefined : end);
  return [...body.matchAll(/^\s*slug:\s*'([^']+)'/gm)].map((m) => m[1]);
}

function loadManifest() {
  if (!existsSync(MANIFEST_FILE)) {
    errors.push(`Missing ${path.relative(REPO_ROOT, MANIFEST_FILE)}.`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
  } catch (err) {
    errors.push(`${path.relative(REPO_ROOT, MANIFEST_FILE)} is not valid JSON: ${err.message}`);
    return null;
  }
}

const manifest = loadManifest();
if (!manifest) {
  report([], new Map());
  process.exit(1);
}

const entries = Array.isArray(manifest.articles) ? manifest.articles : [];
if (!manifest.helpSource) {
  errors.push('manifest.json is missing "helpSource" — say where the article list comes from (§4.1).');
}
if (!entries.length) {
  errors.push('manifest.json has no "articles" entries.');
}

// ── Per-entry checks (§4.3) ────────────────────────────────────────────────────────────────────
const byStatus = new Map();

for (const [i, entry] of entries.entries()) {
  const label = entry.article ?? entry.spec ?? `articles[${i}]`;

  if (entry.waiver) {
    waivers++;
    if (entry.spec) {
      errors.push(`${label}: has BOTH a waiver and a spec. Pick one.`);
    }
    if (String(entry.waiver).trim().length < 20) {
      errors.push(`${label}: waiver must give a real reason, not a placeholder.`);
    }
    continue;
  }

  const status = entry.status;
  if (!status) {
    errors.push(`${label}: missing "status" (one of ${VALID_STATUS.join(", ")}).`);
  } else if (!VALID_STATUS.includes(status)) {
    errors.push(`${label}: status "${status}" is not one of ${VALID_STATUS.join(", ")}.`);
  } else {
    byStatus.set(status, (byStatus.get(status) ?? 0) + 1);
  }

  if (entry.kind && !VALID_KIND.includes(entry.kind)) {
    errors.push(`${label}: kind "${entry.kind}" is not one of ${VALID_KIND.join(", ")}.`);
  }
  if (entry.sideEffects && !VALID_SIDE_EFFECTS.includes(entry.sideEffects)) {
    errors.push(`${label}: sideEffects "${entry.sideEffects}" is not one of ${VALID_SIDE_EFFECTS.join(", ")}.`);
  }

  if (!entry.spec) {
    // §4.3: only a "todo" may omit the spec, and --strict is the launch gate that refuses it.
    if (status === "todo") {
      const msg = `${label}: status "todo" with no spec.`;
      if (STRICT) errors.push(`${msg} --strict requires every article to be recorded or waived.`);
      else warnings.push(msg);
    } else {
      errors.push(`${label}: has neither "spec" nor "waiver".`);
    }
    continue;
  }

  specsNamed.add(entry.spec);
  if (!existsSync(path.join(REPO_ROOT, entry.spec))) {
    errors.push(`${label}: names ${entry.spec}, which does not exist.`);
  }
}

// ── Article coverage (§4.2) ────────────────────────────────────────────────────────────────────
const articles = seedSlugs();
const covered = new Set(entries.map((e) => e.article).filter(Boolean));
for (const slug of articles) {
  if (!covered.has(slug)) {
    errors.push(`Help article "${slug}" is in the seed but missing from the manifest.`);
  }
}
const seedSet = new Set(articles);
manifestOnly = [...covered].filter((slug) => !seedSet.has(slug));

// ── Orphan specs (§4.4) ────────────────────────────────────────────────────────────────────────
const specFiles = existsSync(SPEC_DIR)
  ? readdirSync(SPEC_DIR).filter((f) => f.endsWith(".tutorial.ts")).map((f) => `e2e/tutorials/${f}`)
  : [];
for (const file of specFiles) {
  if (!specsNamed.has(file)) {
    errors.push(`${file} exists but no manifest entry names it (a lead demo with no article uses "article": null).`);
  }
}

report(articles, byStatus);
process.exit(errors.length ? 1 : 0);

// ── Output (§4.5) ──────────────────────────────────────────────────────────────────────────────
function report(articleSlugs, statusCounts) {
  for (const w of warnings) console.log(`warn  ${w}`);
  for (const e of errors) console.error(`FAIL  ${e}`);
  if (manifestOnly.length) {
    console.log(
      `note  ${manifestOnly.length} manifest entr${manifestOnly.length === 1 ? "y is" : "ies are"} not in the seed ` +
        `(published to the help DB by hand, or stale): ${manifestOnly.join(", ")}`,
    );
  }
  const counts = VALID_STATUS.filter((s) => statusCounts.get(s)).map((s) => `${s} ${statusCounts.get(s)}`).join(", ");
  console.log(
    `tutorial:check — ${articleSlugs.length} articles in the seed, ${specsNamed.size} specs, ${waivers} waivers` +
      `${counts ? `; ${counts}` : ""}${STRICT ? " [strict]" : ""} → ${errors.length ? `${errors.length} failure(s)` : "OK"}`,
  );
}
