/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Adding this to suppress the warning during build.
  // The actual fonts are loaded in app/layout.tsx
  // and this doesn't affect the final output.
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;
