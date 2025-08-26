/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // These packages are used in server-side API routes and should not be bundled into the client-side build.
    // Excluding them from the webpack bundle resolves module not found errors during the build process.
    if (!isServer) {
      config.externals.push('firebase-admin');
      config.externals.push('firebase-functions');
    }

    return config;
  },
};

export default nextConfig;
