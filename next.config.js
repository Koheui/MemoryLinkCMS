/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  publicRuntimeConfig: {
    firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    firebaseProjectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    firebaseStorageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    firebaseMessagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    firebaseAppId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
};

module.exports = config;
