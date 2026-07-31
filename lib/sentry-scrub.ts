import type { ErrorEvent } from "@sentry/nextjs";

// PII scrubber for Sentry's `beforeSend` (Better Stack ingest uses the Sentry SDK).
//
// A crash report must never carry a learner's email, a magic-link / verification / share token,
// a cookie, or an Authorization header off to a third party. This repo has no shared redaction
// helper, so this module is self-contained: it strips credential-bearing query params, long
// random path segments (share slugs, signed URLs, JWT-ish blobs), labelled secrets, and email
// addresses out of any free text before the event leaves the process.
//
// It never returns null. We still want the crash signal, just with the credentials removed.

const REDACTED = "[redacted]";

// Query-param names whose VALUE is a credential: verification/reset tokens, OAuth codes, API
// keys, session ids, signed-URL signatures. Matched loosely so `access_token`, `apiKey`, and
// `csrfToken` all hit.
const SENSITIVE_PARAM =
  /(token|secret|code|key|auth|session|passw|signature|sig|credential|otp|nonce)/i;

// A path segment that looks like a random credential rather than a route slug: long and
// alphanumeric-ish (share tokens, JWTs, signed blobs).
const RANDOM_SEGMENT = /^[A-Za-z0-9_.~-]{24,}$/;

// ...with one deliberate exception. A 24-char lowercase-hex segment is a Mongo ObjectId, which
// is this app's public resource id (sets, sessions, users appear in URLs everywhere). It is an
// identifier, not a credential, and it is the main handle for triaging a report, so it stays.
const OBJECT_ID = /^[a-f0-9]{24}$/;

const URL_IN_TEXT = /\bhttps?:\/\/[^\s"'<>)\]}]+/gi;
const EMAIL_IN_TEXT = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// `Authorization: Bearer x`, `api_key=x`, `token: x`, `password="x"` in a thrown message. The
// optional scheme word matters: without it the pass eats `Bearer` and leaves the JWT behind.
const LABELLED_SECRET =
  /\b(authorization|api[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token|token|secret|password|passwd|cookie|set-cookie)\b\s*[:=]\s*(?:bearer\s+|basic\s+)?["']?[^\s"',;)]+/gi;

// ...and a bare `Bearer eyJ...` with no label in front of it.
const BEARER_TOKEN = /\bbearer\s+[A-Za-z0-9._~+/=-]{8,}/gi;

/** Strip credential material out of a single URL. Returns the input unchanged if unparseable. */
export function redactUrl(raw: string): string {
  try {
    const url = new URL(raw);

    for (const key of Array.from(url.searchParams.keys())) {
      if (SENSITIVE_PARAM.test(key)) url.searchParams.set(key, REDACTED);
    }

    url.pathname = url.pathname
      .split("/")
      .map((seg) => {
        if (!seg || OBJECT_ID.test(seg)) return seg;
        return RANDOM_SEGMENT.test(seg) ? REDACTED : seg;
      })
      .join("/");

    // A fragment can carry a token too (implicit OAuth flows), and it is never needed for triage.
    if (url.hash) url.hash = "";

    return url.toString();
  } catch {
    // Not a parseable absolute URL. Fall back to the bare-query-string pass below.
    return redactQueryString(raw);
  }
}

/** Redact sensitive values in a bare `a=1&token=x` string (Sentry's `request.query_string`). */
export function redactQueryString(raw: string): string {
  if (!raw.includes("=")) return raw;
  return raw
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq < 0) return pair;
      const key = pair.slice(0, eq);
      return SENSITIVE_PARAM.test(key) ? `${key}=${REDACTED}` : pair;
    })
    .join("&");
}

/** Redact URLs, labelled secrets, and email addresses inside arbitrary free text. */
export function redactText(text: string): string {
  return text
    .replace(URL_IN_TEXT, (match) => redactUrl(match))
    .replace(LABELLED_SECRET, (_match, label: string) => `${label}: ${REDACTED}`)
    .replace(BEARER_TOKEN, `Bearer ${REDACTED}`)
    .replace(EMAIL_IN_TEXT, "[redacted email]");
}

/** Sentry `beforeSend` hook. Removes PII and credentials from an outgoing error event. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrub = (s: string | undefined): string | undefined => (s ? redactText(s) : s);

  if (event.message) event.message = scrub(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrub(ex.value);
  }

  // Never ship the account identity or the network origin.
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.username;
  }

  // Request context: keep a scrubbed URL for triage, drop the credential-bearing parts.
  if (event.request) {
    if (typeof event.request.url === "string") event.request.url = redactUrl(event.request.url);
    if (typeof event.request.query_string === "string") {
      event.request.query_string = redactQueryString(event.request.query_string);
    }
    delete event.request.cookies;
    const headers = event.request.headers as Record<string, string> | undefined;
    if (headers) {
      delete headers.cookie;
      delete headers.authorization;
      delete headers["set-cookie"];
      // Header names are case-insensitive on the wire but plain object keys here.
      delete headers.Cookie;
      delete headers.Authorization;
    }
  }

  // The SDK auto-records fetch/xhr/navigation breadcrumbs, and those URLs carry tokens too.
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.message) crumb.message = redactText(crumb.message);
    const data = crumb.data as Record<string, unknown> | undefined;
    if (data) {
      for (const key of ["url", "to", "from"]) {
        if (typeof data[key] === "string") data[key] = redactUrl(data[key] as string);
      }
    }
  }

  return event;
}
