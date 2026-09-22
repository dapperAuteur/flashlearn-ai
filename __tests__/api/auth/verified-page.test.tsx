/**
 * @jest-environment node
 */
// /verified must stay reachable signed out (people verify from their inbox before signing in), but
// it must not tell a visitor "Your email has been successfully verified" unless the verify route
// just sent them there. Reported 2026-09-21: anyone could open /verified and read the success text.
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { VERIFIED_NOTICE_COOKIE } from "@/lib/auth/verified-notice";

const cookieValue = { current: undefined as string | undefined };
jest.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === VERIFIED_NOTICE_COOKIE && cookieValue.current !== undefined
        ? { name, value: cookieValue.current }
        : undefined,
  }),
}));
const redirect = jest.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT ${to}`);
});
jest.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));

import VerifiedPage from "@/app/(auth)/verified/page";

describe("/verified", () => {
  beforeEach(() => redirect.mockClear());

  it("sends a direct visit to sign-in instead of claiming success", async () => {
    cookieValue.current = undefined;
    await expect(VerifiedPage()).rejects.toThrow("NEXT_REDIRECT /auth/signin");
    expect(redirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("shows the success page to the browser the verify route just sent", async () => {
    cookieValue.current = "1";
    const page = await VerifiedPage();
    expect(redirect).not.toHaveBeenCalled();
    expect(renderToStaticMarkup(page)).toContain("Email Verified!");
  });

  it("is set by the verify route, scoped to /verified and short-lived", () => {
    const src = readFileSync("app/api/auth/verify-email/route.ts", "utf8");
    expect(src).toMatch(/cookies\.set\(VERIFIED_NOTICE_COOKIE/);
    expect(src).toMatch(/path: "\/verified"/);
    expect(src).toMatch(/httpOnly: true/);
    expect(src).toMatch(/maxAge: 120/);
  });
});
