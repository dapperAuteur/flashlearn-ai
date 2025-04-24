// next.config.js
import type { NextConfig } from "next";
// /** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Don't attempt to bundle these modules
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

module.exports = nextConfig;