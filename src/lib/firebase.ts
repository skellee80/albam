import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyC_UBILTyP5hLYszfcwBws_GuHTUWaY3hI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "albam-bb07e.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "albam-bb07e",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "albam-bb07e.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "214464229053",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:214464229053:web:b2cd7266cdcce7aa8851d4"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Authentication 및 Firestore 인스턴스
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
