// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, serverTimestamp } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Check if Firebase has already been initialized.
if (getApps().length === 0) {
    // If not initialized, check for the auto-generated config from Firebase Hosting.
    // This script is injected by Firebase Hosting automatically.
    fetch('/__/firebase/init.json').then(async response => {
        if (response.ok) {
            const firebaseConfig = await response.json();
            app = initializeApp(firebaseConfig);
            // Initialize analytics only in the browser and if config is valid
            if (typeof window !== "undefined") {
               getAnalytics(app);
            }
        } else {
            // This is a fallback for local development or environments
            // where the Firebase Hosting script isn't available.
            // It uses the environment variables from .env.local.
            console.log("Using fallback firebase config from .env.local");
            const firebaseConfig = {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            };
            app = initializeApp(firebaseConfig);
        }
        // Assign services after initialization
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
    });
} else {
  // If already initialized, get the existing app instance.
  app = getApp();
}

// Re-assign services on every load (for HMR)
auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

// Export the initialized instances to be used across the app.
export { app, auth, db, storage, serverTimestamp };
