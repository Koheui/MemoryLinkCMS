
/** @type {import('next').NextConfig} */
const config = {
  // Adding a new option to force a full rebuild of the webpack cache.
  // This helps resolve inconsistent states in the .next directory.
  experimental: {
    serverComponentsExternalPackages: ['@firebase/auth', '@firebase/firestore'],
  },
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

module.exports = config;
