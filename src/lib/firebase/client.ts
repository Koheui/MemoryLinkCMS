// src/lib/firebase/client.ts
import { initializeApp, getApps, getApp, FirebaseApp, FirebaseOptions } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore, serverTimestamp } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// This function must be called once, at the root of the application.
// It ensures that Firebase is initialized before any other services are used.
const initializeFirebase = (config: FirebaseOptions): FirebaseApp => {
  if (!getApps().length) {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  } else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
  return app;
};


// Export the initialized instances to be used across the app.
// These will be undefined until initializeFirebase is called.
export { app, auth, db, storage, serverTimestamp, initializeFirebase };
