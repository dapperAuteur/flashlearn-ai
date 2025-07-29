import type { NextConfig } from "next";
/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Add the headers function to define Content Security Policy
  async headers() {
    return [
      {
        // Apply these headers to all routes in your application.
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // This policy allows scripts, iframes, and connections necessary for Consolto.
            // For production, consider tightening this policy further.
            value: [
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://client.consolto.com;",
              "style-src 'self' 'unsafe-inline';",
              "frame-src https://client.consolto.com;",
              "img-src 'self' data: https:;",
              "connect-src 'self' wss://*.consolto.com;",
            ].join(' '),
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