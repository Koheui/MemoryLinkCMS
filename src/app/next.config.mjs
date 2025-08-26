// next.config.mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true, // Recommended for static exports
  // Optional: Add a base path if you are deploying to a subdirectory
  // basePath: '/your-repo-name',

  // Optional: Change the output directory `out`
  // distDir: 'dist',
  
   images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
