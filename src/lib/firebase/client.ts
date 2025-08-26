// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, serverTimestamp } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

const initializeFirebase = (config: FirebaseOptions): void => {
  if (!getApps().length) {
      app = initializeApp(config);
  } else {
      app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
};

// Exporting the function to initialize and the instances to be used across the app.
// The instances will be undefined until initializeFirebase is called.
export { app, auth, db, storage, serverTimestamp, initializeFirebase };
