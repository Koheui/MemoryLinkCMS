// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, serverTimestamp } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function ensures that Firebase is initialized only once.
const getFirebaseApp = () => {
    if (app) {
        return app;
    }
    if (getApps().length === 0) {
        // Only initialize if it hasn't been initialized yet.
        // This is the primary entry point for initialization.
        app = initializeApp(firebaseConfig);
    } else {
        // Or get the default app if it has been initialized elsewhere.
        app = getApp();
    }
    return app;
};

const getFirebaseAuth = () => {
    if (!auth) {
        auth = getAuth(getFirebaseApp());
    }
    return auth;
};

const getFirestoreDB = () => {
    if (!db) {
        db = getFirestore(getFirebaseApp());
    }
    return db;
};

const getFirebaseStorage = () => {
    if (!storage) {
        storage = getStorage(getFirebaseApp());
    }
    return storage;
};

// We call the getters to ensure they are initialized on first import.
const initializedApp = getFirebaseApp();
const initializedAuth = getFirebaseAuth();
const initializedDb = getFirestoreDB();
const initializedStorage = getFirebaseStorage();

// Initialize analytics only in the browser and if supported
if (typeof window !== "undefined") {
    isSupported().then(supported => {
        if(supported) {
            getAnalytics(initializedApp);
        }
    })
}


export { 
    initializedApp as app, 
    initializedAuth as auth, 
    initializedDb as db, 
    initializedStorage as storage, 
    serverTimestamp 
};
