/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // The following is needed to disable image optimization as it is not supported in `output: 'export'` mode
  images: {
    unoptimized: true
  },
  reactStrictMode: false
};

export default nextConfig;
