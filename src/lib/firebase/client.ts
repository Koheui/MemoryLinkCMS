
// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function initializes and returns the Firebase app instance.
export const getFirebaseApp = (): FirebaseApp => {
    // If the app is already initialized, return it.
    if (getApps().length > 0) {
        return getApp();
    }

    // Check for missing environment variables before initialization.
    // This provides a clear error message if the .env.local file is not set up correctly.
    for (const [key, value] of Object.entries(firebaseConfig)) {
        if (!value) {
            throw new Error(`Firebase config is not valid. The variable NEXT_PUBLIC_${key.replace(/([A-Z])/g, '_$1').toUpperCase()} is missing. Please check your .env.local file.`);
        }
    }

    // Initialize the Firebase app.
    const app = initializeApp(firebaseConfig);

    // Initialize Analytics if running in a browser environment.
    if (typeof window !== "undefined") {
        isSupported().then(yes => {
            if (yes) {
                getAnalytics(app);
            }
        }).catch(err => {
            console.warn("Firebase Analytics not supported in this environment:", err);
        });
    }

    return app;
};
