/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  reactStrictMode: true,
  // この設定は、ビルド時に 'out' ディレクトリに静的ファイルを生成するために必要です。
  // これにより、Firebase Hostingで静的サイトとしてデプロイできます。
};

module.exports = config;
