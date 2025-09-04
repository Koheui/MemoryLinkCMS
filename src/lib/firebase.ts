import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD-0mlhluuKRN-sihAiCmukEgkZVs6eTLI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "memorylink-cms.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "memorylink-cms",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "memorylink-cms.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "115478197771",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:115478197771:web:c6d08357f72d636897f90e"
};

// APIキーが期限切れの場合の一時的な対処
const isApiKeyExpired = false; // trueからfalseに変更

let app: any = null;
let auth: any = null;
let db: any = null;
let storage: any = null;

if (!isApiKeyExpired) {
  // 通常のFirebase初期化
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  console.log('Firebase initialized with config:', {
    apiKey: firebaseConfig.apiKey ? 'SET' : 'NOT SET',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    customDomain: process.env.NEXT_PUBLIC_CMS_DOMAIN || 'Not set'
  });
} else {
  // モックFirebase（APIキー期限切れ時の一時的対処）
  console.warn('⚠️ Firebase APIキーが期限切れのため、モックモードで動作しています');
  console.warn('Firebase ConsoleでAPIキーを更新してください');
  
  // モックオブジェクト
  app = {
    name: '[DEFAULT]',
    options: firebaseConfig
  };
  
  auth = {
    app,
    currentUser: null,
    onAuthStateChanged: (callback: any) => {
      console.log('Mock auth state changed');
      return () => {};
    }
  };
  
  db = {
    app,
    type: 'firestore'
  };
  
  storage = {
    app,
    type: 'storage'
  };
}

export { auth, db, storage };
export default app;
