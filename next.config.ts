import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const cspHeader = [
      // Base policy: default to 'self'
      "default-src 'self'",
      // Allow scripts from self, inline scripts, eval scripts (unsafe but needed for some dev tools), and our specific external services.
      // We also explicitly define script-src-elem for modern browsers.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://client.consolto.com https://va.vercel-scripts.com",
      "script-src-elem 'self' 'unsafe-inline' https://client.consolto.com https://va.vercel-scripts.com",
      // Allow styles from self and inline styles.
      "style-src 'self' 'unsafe-inline'",
      // Allow images from self, data URIs, and any HTTPS source.
      "img-src 'self' data: https:",
      // Allow fonts from self and any HTTPS source.
      "font-src 'self' https:",
      // Allow WebSocket connections for Consolto and data connections for Vercel Analytics.
      "connect-src 'self' wss://*.consolto.com https://vitals.vercel-insights.com",
      // Allow the Consolto widget to be embedded in an iframe.
      "frame-src https://client.consolto.com",
      // Specify which domains can be parents of this page in an iframe.
      "frame-ancestors 'self'",
      // Specify valid sources for <form> actions.
      "form-action 'self'",
      // Specify valid base URIs.
      "base-uri 'self'",
    ].join('; '); // Correctly join directives with semicolons.

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Don't attempt to bundle these modules on the client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        net: false,
        dns: false,
        tls: false,
        'aws-sdk': false,
        'mock-aws-s3': false,
        nock: false,
      };
    }
    
    // Add a rule to handle HTML files (needed for node-pre-gyp)
    config.module.rules.push({
      test: /\.html$/,
      use: 'ignore-loader',
    });
    
    return config;
  },
  
  // Prevent server-side bundling of problematic packages
  experimental: {
    serverComponentsExternalPackages: [
      '@mapbox/node-pre-gyp',
      'bcrypt',
      'mock-aws-s3',
      'nock',
      'aws-sdk'
    ],
  },
};

export default nextConfig;
