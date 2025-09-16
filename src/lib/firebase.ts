import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
};

// Firebase 초기화 - 중복 초기화 방지
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('✓ Firebase 앱 초기화 완료:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
  });
} else {
  app = getApps()[0];
  console.log('✓ 기존 Firebase 앱 사용');
}

// Authentication 및 Firestore 인스턴스
export const auth = getAuth(app);
export const db = getFirestore(app); // 기본 데이터베이스 사용

// Firebase Auth 설정 최적화
if (typeof window !== 'undefined') {
  // 브라우저 환경에서만 실행
  console.log('Firebase 클라이언트 초기화 상태:', {
    app: !!app,
    auth: !!auth,
    db: !!db,
    projectId: app.options.projectId,
    databaseId: '(default)', // 사용 중인 데이터베이스 ID
    timestamp: new Date().toISOString()
  });
  
  // Auth 상태 변경 감지를 위한 초기 설정
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('사용자 로그인 상태:', { uid: user.uid, email: user.email });
    } else {
      console.log('사용자 로그아웃 상태');
    }
  });
}

export default app;

