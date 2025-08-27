// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
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

const initialize = async (): Promise<FirebaseApp> => {
    if (!firebaseConfig.projectId) {
      throw new Error("Firebase config is not valid. Project ID is missing. Please check your .env.local file.");
    }

    const app = initializeApp(firebaseConfig);

    if (typeof window !== "undefined") {
        try {
            const analyticsSupported = await isSupported();
            if (analyticsSupported) {
                getAnalytics(app);
            }
        } catch (error) {
            console.warn("Firebase Analytics is not available in this environment.", error);
        }
    }
    return app;
};

export const getFirebaseApp = (): Promise<FirebaseApp> => {
    if (getApps().length > 0) {
        return Promise.resolve(getApp());
    }

    if (!appPromise) {
        appPromise = initialize();
    }
    
    return appPromise;
}
