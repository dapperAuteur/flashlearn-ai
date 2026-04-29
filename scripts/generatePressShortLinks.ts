/**
 * Bulk-generate Switchy.io short links for every URL in every press release.
 *
 * Run: npm run press:short-links
 *
 * Reads each press/2026-04-*.md file. Extracts every distinct https URL.
 * For each (release-file × destination-url), creates a Switchy short link
 * with slug `p-{release-slug}-{destination-slug}`. Writes a sidecar JSON to
 * press/short-links/{release-name}.json mapping originalUrl -> shortUrl.
 *
 * Idempotent: if the sidecar already has the URL, skips re-creation. Safe to
 * re-run after editing a release (new URLs get short links; existing URLs
 * stay unchanged).
 *
 * Skips: mailto: links (Switchy can't shorten them), the distribution-playbook
 * itself (it's the workflow doc, not press copy that gets sent), and the
 * press-release-*.md (March 2026 originals — leave them archival).
 *
 * Distribution workflow (from press/distribution-playbook.md):
 *   1. After editing a release, run `npm run press:short-links`.
 *   2. When sending, look up the release's sidecar JSON.
 *   3. Substitute every original URL with its short URL.
 *   4. Append channel-specific UTM params (e.g. `?utm_source=hn`,
 *      `?utm_source=reddit-rprogramming`, `?utm_source=email-techcrunch`).
 *      Switchy passes UTMs through to the destination so both Switchy and
 *      the destination's GA see the channel.
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { createShortLink } from '../lib/switchy';

// Env vars (SWITCHY_API_TOKEN, SWITCHY_DOMAIN, SWITCHY_PIXEL_IDS) are loaded
// by tsx's --env-file flag from package.json's npm script (`npm run press:short-links`).

const PRESS_DIR = join(process.cwd(), 'press');
const SIDECAR_DIR = join(PRESS_DIR, 'short-links');
const RELEASE_PATTERN = /^2026-04-.*\.md$/;

interface Sidecar {
  release: string;
  generatedAt: string;
  notes?: string;
  links: Record<string, { shortUrl: string; slug: string; createdAt: string }>;
}

// Extract every https URL from a markdown body. Markdown link form
// `[text](https://...)` and bare `https://...` both caught. mailto: skipped.
function extractUrls(body: string): string[] {
  const urls = new Set<string>();
  const urlRegex = /https?:\/\/[^\s)\]<>"`]+/gi;
  for (const match of body.matchAll(urlRegex)) {
    let url = match[0];
    // Trim trailing punctuation that markdown / prose tends to glue on.
    url = url.replace(/[.,;:!?'"]+$/, '');
    urls.add(url);
  }
  return Array.from(urls).sort();
}

// Convert "https://flashlearnai.witus.online/docs/api/ecosystem" into a slug
// suffix like "flashlearnai-docs-api-ecosystem". No truncation here; collision
// avoidance happens by including the FULL path in the slug.
function destinationSlug(url: string): string {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, '').split('.')[0];
  const path = u.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-');
  const combined = path ? `${host}-${path}` : host;
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Strip "2026-04-" and ".md" off the release filename to get a stable slug.
function releaseSlugFromFilename(filename: string): string {
  return filename
    .replace(/^2026-04-/, '')
    .replace(/\.md$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Build the final Switchy slug as `p-{release}-{dest}` with a single overall
// cap (Switchy slug limit appears to be ~80 chars based on testing). If the
// natural slug exceeds the cap, abbreviate the release portion first since
// the destination identity matters more for click-attribution debuggability.
function buildSlug(releaseSlug: string, destSlug: string, maxLen = 80): string {
  const prefix = 'p-';
  const sep = '-';
  let release = releaseSlug;
  let dest = destSlug;
  let candidate = `${prefix}${release}${sep}${dest}`;
  if (candidate.length <= maxLen) return candidate;
  // Abbreviate release first (shorten common words like "press-release-").
  release = release.replace(/^press-release-/, '').replace(/-students$/, '-stu');
  candidate = `${prefix}${release}${sep}${dest}`;
  if (candidate.length <= maxLen) return candidate;
  // Still too long: hash-suffix the dest after a hard truncate.
  const room = maxLen - prefix.length - release.length - sep.length;
  if (room < 16) {
    // Pathological: release alone is too long. Just truncate the whole thing.
    return candidate.slice(0, maxLen);
  }
  const hash = Math.abs(hashString(dest)).toString(36).slice(0, 6);
  const destTrunc = dest.slice(0, room - 7); // 7 = "-" + 6-char hash
  return `${prefix}${release}${sep}${destTrunc}-${hash}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

async function readSidecar(filename: string): Promise<Sidecar> {
  const path = join(SIDECAR_DIR, `${filename.replace(/\.md$/, '.json')}`);
  if (!existsSync(path)) {
    return {
      release: filename,
      generatedAt: new Date().toISOString(),
      notes: 'Auto-generated by scripts/generatePressShortLinks.ts. See press/distribution-playbook.md for the substitution workflow.',
      links: {},
    };
  }
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as Sidecar;
}

async function writeSidecar(filename: string, sidecar: Sidecar): Promise<void> {
  if (!existsSync(SIDECAR_DIR)) {
    await mkdir(SIDECAR_DIR, { recursive: true });
  }
  const path = join(SIDECAR_DIR, `${filename.replace(/\.md$/, '.json')}`);
  sidecar.generatedAt = new Date().toISOString();
  await writeFile(path, JSON.stringify(sidecar, null, 2) + '\n', 'utf8');
}

async function processRelease(filename: string): Promise<{ created: number; skipped: number; failed: number }> {
  const filepath = join(PRESS_DIR, filename);
  const body = await readFile(filepath, 'utf8');
  const urls = extractUrls(body);
  const sidecar = await readSidecar(filename);
  const releaseSlug = releaseSlugFromFilename(filename);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const url of urls) {
    if (sidecar.links[url]) {
      skipped += 1;
      continue;
    }
    const destSlug = destinationSlug(url);
    const slug = buildSlug(releaseSlug, destSlug);

    process.stdout.write(`  ${url}\n    -> creating slug "${slug}" ... `);

    const result = await createShortLink({
      url,
      slug,
      title: `Press release: ${filename}`,
      description: `Tracking link for the ${filename} press release.`,
      tags: ['press', `release:${releaseSlug}`],
    });

    if (result) {
      sidecar.links[url] = {
        shortUrl: result.short_url,
        slug: result.id,
        createdAt: new Date().toISOString(),
      };
      created += 1;
      process.stdout.write(`OK ${result.short_url}\n`);
    } else {
      failed += 1;
      process.stdout.write('FAILED (see [switchy] error above)\n');
    }
  }

  if (created > 0 || skipped > 0 || failed > 0) {
    await writeSidecar(filename, sidecar);
  }

  return { created, skipped, failed };
}

async function main(): Promise<void> {
  if (!process.env.SWITCHY_API_TOKEN) {
    console.error('SWITCHY_API_TOKEN not set. Add it to .env.local and re-run.');
    process.exit(1);
  }

  const allFiles = await readdir(PRESS_DIR);
  const releaseFiles = allFiles.filter((f) => RELEASE_PATTERN.test(f)).sort();

  console.log(`Generating Switchy short links for ${releaseFiles.length} press releases.`);
  console.log(`Domain: ${process.env.SWITCHY_DOMAIN ?? 'hi.switchy.io'}`);
  console.log('');

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const filename of releaseFiles) {
    console.log(`=== ${filename} ===`);
    const result = await processRelease(filename);
    console.log(`  Summary: ${result.created} created, ${result.skipped} skipped (already existed), ${result.failed} failed.\n`);
    totalCreated += result.created;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
  }

  console.log('---');
  console.log(`Done. ${totalCreated} new short links created. ${totalSkipped} already existed. ${totalFailed} failed.`);
  console.log(`Sidecars at: ${SIDECAR_DIR}`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
