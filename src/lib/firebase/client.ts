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
    // Check for missing environment variables *before* initialization
    for (const [key, value] of Object.entries(firebaseConfig)) {
        if (!value) {
            // This will throw a clear error if a variable is missing
            throw new Error(`Firebase config is not valid. The variable NEXT_PUBLIC_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()} is missing. Please check your environment variables.`);
        }
    }
    
    if (getApps().length > 0) {
        return getApp();
    }

    const app = initializeApp(firebaseConfig);

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

export const getFirebaseApp = (): FirebaseApp => {
    return initializeClientApp();
}
