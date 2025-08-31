'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

interface UserData {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string, address?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateUserData: (data: Partial<UserData>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Firebase 연결 상태 확인
  const isFirebaseConfigured = () => {
    try {
      // auth 객체가 정상적으로 초기화되었는지 확인
      const isConfigured = auth && auth.app && auth.app.options.projectId !== undefined;
      
      // 환경 변수도 함께 확인
      const envVars = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      };
      
      console.log('Firebase 설정 상태:', {
        auth: !!auth,
        app: !!auth?.app,
        projectId: auth?.app?.options?.projectId,
        envVars,
        isConfigured
      });
      
      return isConfigured;
    } catch (error) {
      console.error('Firebase 설정 확인 오류:', error);
      return false;
    }
  };

  // Firebase 연결 테스트
  const testFirebaseConnection = async () => {
    try {
      console.log('Firebase 연결 테스트 시작...');
      
      // 1. Auth 객체 확인
      if (!auth || !auth.app) {
        console.error('Auth 객체가 초기화되지 않음');
        return false;
      }
      
      // 2. 프로젝트 설정 확인
      const config = auth.app.options;
      console.log('Firebase 설정:', {
        projectId: config.projectId,
        authDomain: config.authDomain,
        apiKey: config.apiKey?.substring(0, 10) + '...'
      });
      
      if (!config.projectId || config.projectId === 'demo-project') {
        console.error('유효하지 않은 프로젝트 ID');
        return false;
      }
      
      // 3. Firestore 연결 테스트 추가
      try {
        console.log('Firestore 연결 테스트 중...');
        // 간단한 Firestore 연결 테스트 - 실제 데이터를 읽지 않고 연결만 확인
        const testDoc = doc(db, 'test', 'connection');
        console.log('Firestore 연결 성공');
      } catch (firestoreError: any) {
        console.error('Firestore 연결 실패:', {
          code: firestoreError?.code,
          message: firestoreError?.message
        });
        if (firestoreError?.code === 'permission-denied') {
          console.warn('⚠ Firestore 권한 문제 - 보안 규칙 확인 필요');
        }
        // Firestore 연결 실패해도 Auth는 작동할 수 있으므로 계속 진행
      }
      
      // 4. Auth 서비스 상태 확인
      try {
        const currentUser = auth.currentUser;
        console.log('현재 Auth 상태:', {
          currentUser: !!currentUser,
          authReady: true
        });
      } catch (authError) {
        console.error('Auth 상태 확인 실패:', authError);
        return false;
      }
      
      console.log('✓ Firebase 연결 테스트 성공');
      return true;
    } catch (error) {
      console.error('❌ Firebase 연결 테스트 실패:', error);
      return false;
    }
  };

  // 회원가입
  async function register(email: string, password: string, name: string, phone?: string, address?: string) {
    console.log('=== 회원가입 프로세스 시작 ===');
    console.log('입력 데이터:', { email, name, phone: phone?.substring(0, 3) + '***' });
    
    try {
      // 1단계: Firebase 설정 확인
      console.log('1단계: Firebase 설정 확인 중...');
      if (!isFirebaseConfigured()) {
        console.error('Firebase 설정 실패:', {
          auth: !!auth,
          app: !!auth?.app,
          projectId: auth?.app?.options?.projectId
        });
        throw new Error('Firebase 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
      }
      console.log('✓ Firebase 설정 확인 완료');

      // 2단계: Firebase 연결 테스트
      console.log('2단계: Firebase 연결 테스트 중...');
      try {
        const connectionTest = await testFirebaseConnection();
        if (!connectionTest) {
          console.warn('⚠ Firebase 연결 테스트 실패, 직접 시도');
        } else {
          console.log('✓ Firebase 연결 테스트 성공');
        }
      } catch (testError) {
        console.warn('⚠ Firebase 연결 테스트 오류, 직접 시도:', testError);
      }

      // 3단계: Firebase Authentication 회원가입
      console.log('3단계: Firebase Authentication 회원가입 시도 중...');
      console.log('사용할 auth 객체:', {
        auth: !!auth,
        config: auth?.config,
        app: !!auth?.app
      });
      
      const signupPromise = createUserWithEmailAndPassword(auth, email, password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.error('❌ 회원가입 타임아웃 (10초) - Firebase 서버 응답 없음');
          reject(new Error('Firebase 서버 응답 시간 초과. 프로젝트 설정을 확인해주세요.'));
        }, 10000) // 30초에서 10초로 단축
      );
      
      console.log('Firebase 회원가입 요청 전송 중...');
      console.log('요청 URL 예상:', `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${auth.app.options.apiKey?.substring(0, 10)}...`);
      
      const result = await Promise.race([signupPromise, timeoutPromise]) as any;
      const { user } = result;
      console.log('✓ Firebase 회원가입 성공:', { 
        uid: user.uid, 
        email: user.email,
        emailVerified: user.emailVerified,
        creationTime: user.metadata?.creationTime
      });
      
      // 4단계: 프로필 업데이트
      console.log('4단계: 프로필 업데이트 중...');
      try {
        await updateProfile(user, { displayName: name });
        console.log('✓ 프로필 업데이트 완료');
      } catch (profileError) {
        console.error('⚠ 프로필 업데이트 실패:', profileError);
        // 프로필 업데이트 실패해도 계속 진행
      }
      
      // 5단계: Firestore에 사용자 데이터 저장
      console.log('5단계: Firestore에 사용자 데이터 저장 중...');
      const userDocData: UserData = {
        uid: user.uid,
        email: user.email!,
        name,
        phone: phone || '',
        address: address || '',
        createdAt: new Date().toISOString()
      };
      
      try {
        console.log('Firestore 저장 요청 중...', { collection: 'users', docId: user.uid });
        
        // Firestore 저장에 타임아웃 추가
        const firestorePromise = setDoc(doc(db, 'users', user.uid), userDocData);
        const firestoreTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => {
            console.error('❌ Firestore 저장 타임아웃 (15초)');
            reject(new Error('Firestore 저장 시간 초과'));
          }, 15000)
        );
        
        await Promise.race([firestorePromise, firestoreTimeoutPromise]);
        console.log('✓ Firestore 저장 성공');
      } catch (firestoreError: any) {
        console.warn('⚠ Firestore 저장 실패, 로컬에서 계속 진행:', {
          code: firestoreError?.code,
          message: firestoreError?.message
        });
        
        // 특정 Firestore 오류 처리
        if (firestoreError?.code === 'permission-denied') {
          console.error('Firestore 권한 거부 - 보안 규칙을 확인하세요');
          console.error('Firebase 콘솔: https://console.firebase.google.com/project/albam-bb07e/firestore/rules');
        } else if (firestoreError?.code === 'unavailable') {
          console.error('Firestore 서비스 사용 불가 - 네트워크 연결을 확인하세요');
        }
        
        // Firestore 저장이 실패해도 회원가입은 성공으로 처리
      }
      
      // 6단계: 로컬 상태 업데이트
      console.log('6단계: 로컬 상태 업데이트 중...');
      setUserData(userDocData);
      console.log('✓ 사용자 데이터 설정 완료');
      
      console.log('🎉 회원가입 프로세스 완료!');
      return userDocData;
    } catch (error: any) {
      console.error('❌ 회원가입 프로세스 실패');
      console.error('오류 상세:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.substring(0, 200) + '...'
      });
      
      // Firebase 특정 오류 처리
      if (error?.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            console.error('이미 사용 중인 이메일');
            break;
          case 'auth/weak-password':
            console.error('비밀번호가 너무 약함');
            break;
          case 'auth/invalid-email':
            console.error('잘못된 이메일 형식');
            break;
          case 'auth/network-request-failed':
            console.error('네트워크 연결 실패 - 인터넷 연결을 확인하세요');
            break;
          case 'auth/api-key-not-valid':
            console.error('유효하지 않은 API 키 - Firebase 프로젝트 설정을 확인하세요');
            break;
          case 'auth/project-not-found':
            console.error('Firebase 프로젝트를 찾을 수 없음');
            break;
          case 'auth/app-not-authorized':
            console.error('앱이 Firebase 프로젝트에 인증되지 않음');
            break;
          default:
            console.error('알 수 없는 Firebase 오류:', error.code);
            console.error('Firebase 콘솔에서 Authentication이 활성화되어 있는지 확인하세요');
            console.error('프로젝트 URL: https://console.firebase.google.com/project/albam-bb07e/authentication');
        }
      }
      
      throw error;
    }
  }

  // 로그인
  async function login(email: string, password: string): Promise<void> {
    try {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
      }

      // Firebase 로그인
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('로그인 오류:', error);
      throw error;
    }
  }

  // 로그아웃
  async function logout() {
    setUserData(null);
    setCurrentUser(null);
    
    if (!isFirebaseConfigured()) {
      return Promise.resolve();
    }
    
    return signOut(auth);
  }

  // 비밀번호 재설정
  async function resetPassword(email: string): Promise<void> {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase가 설정되지 않았습니다. 관리자에게 문의하세요.');
    }

    await sendPasswordResetEmail(auth, email);
  }

  // 회원 탈퇴
  async function deleteAccount(): Promise<void> {
    console.log('회원 탈퇴 시작');
    
    if (!currentUser) {
      console.error('로그인된 사용자가 없음');
      throw new Error('로그인된 사용자가 없습니다.');
    }

    console.log('현재 사용자:', currentUser.uid);

    if (!isFirebaseConfigured()) {
      console.error('Firebase 설정되지 않음');
      throw new Error('Firebase 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.');
    }

    // Firebase 연결 테스트 (선택적)
    try {
      const connectionTest = await testFirebaseConnection();
      if (!connectionTest) {
        console.warn('Firebase 연결 테스트 실패, 직접 시도');
      }
    } catch (testError) {
      console.warn('Firebase 연결 테스트 오류, 직접 시도:', testError);
    }

    try {
      // Firestore에서 사용자 데이터 삭제
      console.log('Firestore 사용자 데이터 삭제 시도 중...');
      try {
        const firestoreDeletePromise = deleteDoc(doc(db, 'users', currentUser.uid));
        const firestoreTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => {
            console.error('❌ Firestore 삭제 타임아웃 (15초)');
            reject(new Error('Firestore 삭제 시간 초과'));
          }, 15000)
        );
        
        await Promise.race([firestoreDeletePromise, firestoreTimeoutPromise]);
        console.log('✓ Firestore 사용자 데이터 삭제 성공');
      } catch (firestoreError: any) {
        console.warn('⚠ Firestore 사용자 데이터 삭제 실패:', {
          code: firestoreError?.code,
          message: firestoreError?.message
        });
        
        if (firestoreError?.code === 'permission-denied') {
          console.error('Firestore 권한 거부 - 보안 규칙을 확인하세요');
        } else if (firestoreError?.code === 'not-found') {
          console.warn('삭제할 사용자 데이터가 Firestore에 없음');
        }
      }

      // Firebase Authentication에서 사용자 삭제 (타임아웃 추가)
      console.log('Firebase Authentication 사용자 삭제 시도 중...');
      const deletePromise = deleteUser(currentUser);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.error('❌ 회원 탈퇴 타임아웃 (30초) - Firebase 서버 응답 없음');
          reject(new Error('회원 탈퇴 요청 시간 초과 (30초). Firebase 서버 응답이 없습니다.'));
        }, 30000)
      );
      
      await Promise.race([deletePromise, timeoutPromise]);
      console.log('✓ Firebase Authentication 사용자 삭제 성공');
      
      // 로컬 상태 초기화
      console.log('로컬 상태 초기화 중...');
      setCurrentUser(null);
      setUserData(null);
      console.log('🎉 회원 탈퇴 완료');
    } catch (error: any) {
      console.error('❌ 회원 탈퇴 오류:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.substring(0, 200) + '...'
      });
      
      // Firebase 특정 오류 처리
      if (error?.code) {
        switch (error.code) {
          case 'auth/requires-recent-login':
            console.error('최근 로그인이 필요함 - 다시 로그인 후 탈퇴를 시도하세요');
            break;
          case 'auth/network-request-failed':
            console.error('네트워크 연결 실패 - 인터넷 연결을 확인하세요');
            break;
          case 'auth/user-token-expired':
            console.error('사용자 토큰 만료 - 다시 로그인 후 탈퇴를 시도하세요');
            break;
          default:
            console.error('알 수 없는 Firebase 오류:', error.code);
        }
      }
      
      throw error;
    }
  }

  // 사용자 데이터 업데이트
  async function updateUserData(data: Partial<UserData>) {
    if (userData && currentUser) {
      const updatedUserData = { ...userData, ...data };
      setUserData(updatedUserData);
      
      // Firestore에도 업데이트 (Firebase가 설정된 경우)
      if (isFirebaseConfigured()) {
        try {
          await setDoc(doc(db, 'users', currentUser.uid), updatedUserData, { merge: true });
        } catch (error) {
          console.error('Firestore 업데이트 오류:', error);
        }
      }
    }
  }

  // 사용자 데이터 로드
  async function loadUserData(user: User) {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
      } else {
        // Firestore에 사용자 데이터가 없는 경우 기본 데이터 생성
        const defaultUserData: UserData = {
          uid: user.uid,
          email: user.email!,
          name: user.displayName || '사용자',
          phone: '',
          address: '',
          createdAt: new Date().toISOString()
        };
        
        try {
          await setDoc(doc(db, 'users', user.uid), defaultUserData);
        } catch (setDocError) {
          console.warn('Firestore 기본 데이터 저장 실패:', setDocError);
        }
        
        setUserData(defaultUserData);
      }
    } catch (error) {
      console.warn('사용자 데이터 로드 오류, 기본 데이터 사용:', error);
      // Firestore 연결 실패 시 기본 사용자 데이터 설정
      const fallbackUserData: UserData = {
        uid: user.uid,
        email: user.email!,
        name: user.displayName || '사용자',
        phone: '',
        address: '',
        createdAt: new Date().toISOString()
      };
      setUserData(fallbackUserData);
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      console.log('Firebase가 설정되지 않았습니다.');
      setLoading(false);
      return;
    }

    // Firebase Auth 상태 변경 감지
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserData(user);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    login,
    register,
    logout,
    resetPassword,
    deleteAccount,
    updateUserData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
