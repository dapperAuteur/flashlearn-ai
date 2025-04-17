// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  webpack: (config) => {
    // DNS lookup issue fix for MongoDB connections
    config.resolve.fallback = { dns: false, net: false, tls: false };
    return config;
  },
};

export default nextConfig;