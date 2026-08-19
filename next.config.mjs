import { withSentryConfig } from '@sentry/nextjs';

// The CSP below pins connect-src to 'self'. When error monitoring is switched on we must also let
// the browser POST to the ingest host, so derive that origin from the public DSN. With no DSN this
// is an empty string and the CSP is byte-for-byte what it was before.
const sentryConnectSrc = (() => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return '';
  try {
    return ` ${new URL(dsn).origin}`;
  } catch {
    return '';
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  serverExternalPackages: ['mongoose', 'pdf-parse'],
  // PostHog's endpoints use trailing slashes (/e/, /flags/, /s/). Without this, Next
  // issues a 308 to the slashless form before the rewrite runs and ingest breaks.
  // Required by PostHog's documented Next.js proxy setup.
  //
  // SIDE EFFECT worth knowing: this disables Next's automatic trailing-slash redirect
  // for EVERY route, not just /ingest. So /about/ no longer 308s to /about and both
  // forms become reachable. The per-page `alternates.canonical` metadata is what keeps
  // search engines pointed at one form — verify those survive any future metadata
  // refactor. See the witus repo's plans/26.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    // Reverse-proxy PostHog through our own origin. us.i.posthog.com is on uBlock
    // Origin, Brave Shields, and Safari's tracker list, so a meaningful share of
    // events never leave the browser — including, reliably, our own test visits.
    // Routing ingest through flashlearnai.witus.online leaves blockers nothing to
    // match on.
    //
    // It also keeps the CSP below untouched: because ingest is same-origin, the
    // existing `connect-src 'self'` and `script-src 'self'` already cover it. A
    // direct-to-PostHog api_host would have needed both widened to a third-party
    // host, which is a strictly worse security posture for the same data.
    //
    // Assets come from a different upstream host than ingest, hence two rules. The
    // more specific /static rule must come first.
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  webpack: (config) => {
    // DNS lookup issue fix for MongoDB connections
    config.resolve.fallback = { dns: false, net: false, tls: false };
    return config;
  },
  // Add security headers configuration
  async headers() {
    return [
      {
        // CORS headers for the public API (v1)
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, X-Request-Id' },
          { key: 'Access-Control-Expose-Headers', value: 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Request-Id' },
          { key: 'Access-Control-Max-Age', value: '86400' },
        ],
      },
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            // THIS IS THE FIX: Allow 'data:' for connect-src to enable image sharing
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://res.cloudinary.com; font-src 'self'; connect-src 'self' data:${sentryConnectSrc}; frame-src 'self'; frame-ancestors 'self'; form-action 'self'; base-uri 'self'; media-src 'self'; object-src 'none'`,
          },
        ],
      },
    ];
  },
};

// Wrap with Sentry's build plugin (Better Stack ingest speaks the Sentry protocol). Safe with no
// Sentry env set: without SENTRY_AUTH_TOKEN it just skips source-map upload, so you get minified
// stack traces, and the runtime SDK stays inert without a DSN. org/project/authToken come from env
// so nothing secret is committed here.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    // Strips the SDK's own debug logging from the bundle. Replaces the deprecated top-level
    // `disableLogger` option. Webpack-only, so it is a no-op under Turbopack (same as the old
    // flag was), but it silences the v10 deprecation warning.
    treeshake: { removeDebugLogging: true },
  },
});
