// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

// This is a singleton promise that will be reused
let appPromise: Promise<FirebaseApp> | null = null;

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function initializeClientApp(): FirebaseApp {
    if (getApps().length > 0) {
        return getApp();
    }

    if (!firebaseConfig.projectId) {
      throw new Error("Firebase config is not valid. Project ID is missing. Please check your .env.local file.");
    }

    const app = initializeApp(firebaseConfig);

    if (typeof window !== "undefined") {
        isSupported().then(yes => yes && getAnalytics(app));
    }
    return app;
};

export const getFirebaseApp = (): FirebaseApp => {
    return initializeClientApp();
}
