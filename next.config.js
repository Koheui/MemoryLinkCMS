/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 開発環境では静的エクスポートを無効化
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  trailingSlash: process.env.NODE_ENV === 'production',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyDvrJpe0cKs43uFQbDu2djUCL-8Kt0dWmk',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'memorylink-cms.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'memorylink-cms',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'memorylink-cms.firebasestorage.app',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '115478197771',
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:115478197771:web:e832ce9f8aa9296a97f90e',
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "fs": false,
      };
    }
    return config;
  },
};

export default nextConfig;
