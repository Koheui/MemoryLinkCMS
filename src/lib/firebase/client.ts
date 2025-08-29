
// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDvrJpe0cKs43uFQbDu2djUCL-8Kt0dWmk',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'memorylink-cms.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'memorylink-cms',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'memorylink-cms.firebasestorage.app',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '115478197771',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:115478197771:web:e832ce9f8aa9296a97f90e',
};

// This function initializes and returns the Firebase app instance.
export const getFirebaseApp = (): FirebaseApp => {
    try {
        // If the app is already initialized, return it.
        if (getApps().length > 0) {
            console.log('Firebase: Returning existing app instance');
            return getApp();
        }

        console.log('Firebase: Initializing new app instance');
        
        // Initialize the Firebase app.
        const app = initializeApp(firebaseConfig);
        console.log('Firebase: App initialized successfully');

        // Initialize Analytics if running in a browser environment (non-blocking).
        if (typeof window !== "undefined") {
            // Analyticsの初期化を非同期で実行し、エラーをキャッチ（ブロッキングしない）
            isSupported().then(yes => {
                if (yes) {
                    try {
                        getAnalytics(app);
                        console.log('Firebase: Analytics initialized');
                    } catch (err) {
                        console.warn("Firebase Analytics initialization failed:", err);
                    }
                }
            }).catch(err => {
                console.warn("Firebase Analytics not supported in this environment:", err);
            });
        }

        return app;
    } catch (error) {
        console.error('Firebase: Error during app initialization:', error);
        throw error;
    }
};
