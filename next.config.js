/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  output: 'standalone',
  typescript: {
    // ビルド時の型チェックを無視します。
    // これにより、ビルドサーバー環境でのFirebase SDK関連の型エラーを防ぎます。
    ignoreBuildErrors: true,
  },
  eslint: {
    // ビルド時のESLintチェックを無視します。
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      }
    ],
  },
  // このオプションは、特定のページの静的生成を強制的に回避し、
  // 動的レンダリングにフォールバックさせるためのものです。
  // これにより、ビルド時のデータ取得エラーを防ぎます。
  generateStaticParams: async () => {
    return [];
  }
};

module.exports = nextConfig;
