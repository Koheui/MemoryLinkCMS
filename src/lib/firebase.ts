import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBT2MzmlNzOvqx-v8Stz9mesXAX9MERLds",
  authDomain: "memorylink-cms.firebaseapp.com",
  projectId: "memorylink-cms",
  storageBucket: "memorylink-cms.firebasestorage.app",
  messagingSenderId: "115478197771",
  appId: "1:115478197771:web:c6d08357f72d636897f90e"
};

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);

// Firebaseサービスの初期化
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
