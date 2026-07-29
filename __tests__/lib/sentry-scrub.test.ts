import { redactUrl, redactQueryString, redactText, scrubEvent } from "@/lib/sentry-scrub";

// The scrubber is the only thing standing between a crash report and a third-party ingest, so
// these assertions are the contract: no email, no cookie, no auth header, no token in a URL.

describe("redactUrl", () => {
  it("redacts credential-bearing query params but keeps the route", () => {
    const out = redactUrl("https://flashlearnai.witus.online/verify?token=abc123&page=2");
    expect(out).toContain("token=%5Bredacted%5D");
    expect(out).toContain("page=2");
    expect(out).toContain("/verify");
  });

  it("redacts a long random path segment", () => {
    const out = redactUrl("https://example.com/share/9dPqXk3mVt2Lz8Rw4YbN6Hs1Jf5Cg7Ad");
    expect(out).toBe("https://example.com/share/[redacted]");
  });

  it("keeps a Mongo ObjectId, which is a resource id and not a credential", () => {
    const out = redactUrl("https://example.com/sets/507f1f77bcf86cd799439011");
    expect(out).toBe("https://example.com/sets/507f1f77bcf86cd799439011");
  });

  it("drops the fragment, which can carry an implicit-flow token", () => {
    expect(redactUrl("https://example.com/x#access_token=abc")).toBe("https://example.com/x");
  });
});

describe("redactQueryString", () => {
  it("redacts only the sensitive keys", () => {
    expect(redactQueryString("page=2&session_id=xyz")).toBe("page=2&session_id=[redacted]");
  });
});

describe("redactText", () => {
  it("removes email addresses", () => {
    expect(redactText("failed for learner@example.com")).toBe("failed for [redacted email]");
  });

  it("removes labelled secrets", () => {
    expect(redactText("Authorization: Bearer eyJhbGciOi")).toContain("[redacted]");
    expect(redactText("Authorization: Bearer eyJhbGciOi")).not.toContain("eyJhbGciOi");
    expect(redactText("api_key=fl_pub_livesecret")).not.toContain("fl_pub_livesecret");
  });

  it("removes a bare bearer token with no label in front of it", () => {
    expect(redactText("sent Bearer eyJhbGciOiJIUzI1NiJ9")).toBe("sent Bearer [redacted]");
  });
});

describe("scrubEvent", () => {
  it("strips user identity, cookies, and auth headers", () => {
    const event = {
      user: { id: "u1", email: "a@b.com", ip_address: "1.2.3.4", username: "learner" },
      request: {
        url: "https://example.com/reset?token=secretvalue",
        query_string: "token=secretvalue",
        cookies: { session: "abc" },
        headers: { cookie: "a=b", authorization: "Bearer x", "user-agent": "jest" },
      },
      breadcrumbs: [{ data: { url: "https://example.com/api/x?api_key=zzz" } }],
    } as unknown as Parameters<typeof scrubEvent>[0];

    const out = scrubEvent(event);

    expect(out.user).toEqual({ id: "u1" });
    expect(out.request?.cookies).toBeUndefined();
    expect(out.request?.headers).toEqual({ "user-agent": "jest" });
    expect(out.request?.url).not.toContain("secretvalue");
    expect(out.request?.query_string).toBe("token=[redacted]");
    expect(JSON.stringify(out.breadcrumbs)).not.toContain("zzz");
  });

  it("returns the event rather than dropping it", () => {
    const event = { message: "boom" } as unknown as Parameters<typeof scrubEvent>[0];
    expect(scrubEvent(event).message).toBe("boom");
  });
});
