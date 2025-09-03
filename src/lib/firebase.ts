import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBT2MzmlNzOvqx-v8Stz9mesXAX9MERLds",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "memorylink-cms.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "memorylink-cms",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "memorylink-cms.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "115478197771",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:115478197771:web:c6d08357f72d636897f90e"
};

// Firebaseアプリの初期化
const app = initializeApp(firebaseConfig);

// Firebaseサービスの初期化
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// デバッグ用：Firebase設定の確認
console.log('Firebase initialized with config:', {
  apiKey: firebaseConfig.apiKey ? 'SET' : 'NOT SET',
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  customDomain: process.env.NEXT_PUBLIC_CMS_DOMAIN || 'Not set'
});

export default app;
