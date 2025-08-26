
// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import getConfig from 'next/config';

const { publicRuntimeConfig } = getConfig() || {};

const firebaseConfig: FirebaseOptions = {
  apiKey: publicRuntimeConfig?.firebaseApiKey,
  authDomain: publicRuntimeConfig?.firebaseAuthDomain,
  projectId: publicRuntimeConfig?.firebaseProjectId,
  storageBucket: publicRuntimeConfig?.firebaseStorageBucket,
  messagingSenderId: publicRuntimeConfig?.firebaseMessagingSenderId,
  appId: publicRuntimeConfig?.firebaseAppId,
};

let app: FirebaseApp;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApp();
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, serverTimestamp };
