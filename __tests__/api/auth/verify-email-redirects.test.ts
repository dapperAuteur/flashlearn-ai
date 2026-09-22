/**
 * @jest-environment node
 */
import * as fs from "node:fs";
import * as path from "node:path";

// Every verification email links to /api/auth/verify-email. Its redirects pointed at /auth/verified
// and /auth/error, which do not exist (the pages live in the (auth) route group, so they are served
// at /verified and /error), so every successful sign-up ended on a 404. This guards the class of bug:
// each path the route redirects to must be a real page.

const ROUTES = ["app/api/auth/verify-email/route.ts", "app/api/verify-email/route.ts"];

/** Every app/**\/page.tsx as the URL path it serves: route groups like "(auth)" add no segment. */
function servedPaths(): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "page.tsx") {
        const segs = path
          .relative("app", path.dirname(p))
          .split(path.sep)
          .filter((s) => s && !/^\(.*\)$/.test(s));
        out.add("/" + segs.join("/"));
      }
    }
  };
  walk("app");
  return out;
}

describe("email verification redirects", () => {
  const pages = servedPaths();

  for (const route of ROUTES) {
    it(`${route} only redirects to pages that exist`, () => {
      const src = fs.readFileSync(route, "utf8");
      const targets = [...src.matchAll(/new URL\("([^"?]+)/g)].map((m) => m[1]);
      expect(targets.length).toBeGreaterThan(0);
      for (const t of targets) expect({ target: t, exists: pages.has(t) }).toEqual({ target: t, exists: true });
    });
  }
});
