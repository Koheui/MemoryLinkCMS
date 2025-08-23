
// src/lib/firebase/firebaseAdmin.ts
import admin from 'firebase-admin';

let app: admin.app.App | null = null;

export function getAdminApp() {
  if (app) return app;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing in .env.local');
  }

  try {
    const cred = JSON.parse(raw);

    // The [DEFAULT] app instance is returned if no name is provided.
    app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert(cred),
          // Add storageBucket to the config to avoid "Bucket not specified" errors
          // when interacting with Storage from the Admin SDK.
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });

    return app;
  } catch (e: any) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e.message);
    throw new Error(`Could not initialize Firebase Admin SDK. Service account JSON might be malformed. Details: ${e.message}`);
  }
}
