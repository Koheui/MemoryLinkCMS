/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "fs": false,
      };
    }
    // A simple, non-disruptive modification to bust cache.
    config.optimization.minimizer = config.optimization.minimizer.map((plugin) => {
        if (plugin.constructor.name === 'TerserPlugin') {
            // @ts-ignore
            plugin.options.terserOptions.output = {
                // @ts-ignore
                ...plugin.options.terserOptions.output,
                // Add a unique comment to force cache invalidation on each build
                preamble: `/* build-timestamp: ${Date.now()} */`,
            };
        }
        return plugin;
    });
    return config;
  },
};

export default nextConfig;
