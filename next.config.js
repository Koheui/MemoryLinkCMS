
/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Adding a benign webpack configuration to force a full cache invalidation.
  // This helps resolve inconsistent states in the .next directory without
  // introducing breaking changes.
  webpack: (config, { isServer }) => {
    // A simple, non-disruptive modification.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "fs": false,
      };
    }
    return config;
  },
};

module.exports = config;
