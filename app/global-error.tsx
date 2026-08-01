'use client';

// app/global-error.tsx
// Last-resort error boundary. Catches errors thrown by the root layout itself, where an
// `error.tsx` would never run because the layout is the thing that broke. It must render its
// own <html> and <body> because the crashed root layout is not there to supply them.
//
// Deliberately dependency-free: no imports from @/components or @/lib (any of which could be
// the thing that is broken) and no Tailwind classes, since globals.css may not have loaded.
// Inline styles only. The one intentional exception is the Sentry SDK: it is the entire reason
// we would ever find out this fired, and it is inert when no DSN is configured.

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Scrubbed by lib/sentry-scrub.ts; a no-op when NEXT_PUBLIC_SENTRY_DSN is unset.
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backgroundColor: '#f8fafc',
          color: '#111827',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <main style={{ maxWidth: '32rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', lineHeight: 1 }} aria-hidden="true">
            📚
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: '0.75rem', fontSize: '0.9375rem', color: '#4b5563' }}>
            FlashLearnAI hit an error it could not recover from. Your saved sets and study
            history are untouched. Reloading usually fixes it.
          </p>
          <div
            style={{
              marginTop: '2rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: '2.75rem',
                padding: '0 1.5rem',
                border: 'none',
                borderRadius: '0.75rem',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                fontSize: '0.9375rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {/* This boundary renders outside the router, so a plain anchor is correct here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                minHeight: '2.75rem',
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0 1.5rem',
                borderRadius: '0.75rem',
                border: '2px solid #e5e7eb',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontSize: '0.9375rem',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Back to home
            </a>
          </div>
          {error.digest ? (
            <p
              style={{
                marginTop: '1.5rem',
                fontSize: '0.75rem',
                color: '#9ca3af',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              }}
            >
              Error ref: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
