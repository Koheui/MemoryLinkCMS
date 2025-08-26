// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

let appPromise: Promise<FirebaseApp> | null = null;

const fetchFirebaseConfig = async () => {
    try {
        const response = await fetch('/__/firebase/init.json');
        if (!response.ok) {
            throw new Error('Firebase config not found');
        }
        return await response.json();
    } catch (error) {
        console.warn("Could not fetch Firebase config from hosting. Using process.env as fallback.");
        // Fallback for local development or if /__/firebase/init.json is not available
        return {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };
    }
};

const initialize = async (): Promise<FirebaseApp> => {
    const firebaseConfig = await fetchFirebaseConfig();
    if (!firebaseConfig.projectId) {
      throw new Error("Firebase config is not valid. Project ID is missing.");
    }

    const app = initializeApp(firebaseConfig);

    if (typeof window !== "undefined") {
        isSupported().then(supported => {
            if (supported) {
                getAnalytics(app);
            }
        });
    }
    return app;
};

export const getFirebaseApp = (): Promise<FirebaseApp> => {
    if (appPromise) {
        return appPromise;
    }
    
    if (getApps().length > 0) {
        appPromise = Promise.resolve(getApp());
        return appPromise;
    }

    appPromise = initialize();
    return appPromise;
}

// You can still export individual services if needed, but they should also use the async app getter.
// Note: These are not recommended for direct use in components anymore. 
// Use getFirebaseApp() to ensure initialization order.
export const getFirebaseAuth = async () => getAuth(await getFirebaseApp());
export const getFirestoreDB = async () => getFirestore(await getFirebaseApp());
export const getFirebaseStorage = async () => getStorage(await getFirebaseApp());
