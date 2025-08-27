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

function initializeClientApp(): FirebaseApp {
    if (getApps().length > 0) {
        return getApp();
    }

    // Check if all required Firebase config keys are present
    if (!firebaseConfig.projectId || !firebaseConfig.apiKey) {
      throw new Error("Firebase config is not valid. Project ID or API Key is missing. Please check your .env.local file and ensure all NEXT_PUBLIC_ variables are set.");
    }

    const app = initializeApp(firebaseConfig);

    if (typeof window !== "undefined") {
        // This promise-based check ensures analytics is only initialized if supported.
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

// Export a single function to get the Firebase app instance.
// This ensures initialization logic is contained and runs only once.
export const getFirebaseApp = (): FirebaseApp => {
    return initializeClientApp();
}