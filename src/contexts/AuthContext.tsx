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
      console.log('Firebase 설정 상태:', {
        auth: !!auth,
        app: !!auth?.app,
        projectId: auth?.app?.options?.projectId,
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
      
      // 더 간단한 테스트: auth 객체 접근
      if (!auth || !auth.app) {
        console.error('Auth 객체가 초기화되지 않음');
        return false;
      }
      
      // 프로젝트 ID 확인
      const projectId = auth.app.options.projectId;
      console.log('프로젝트 ID:', projectId);
      
      if (!projectId || projectId === 'demo-project') {
        console.error('유효하지 않은 프로젝트 ID');
        return false;
      }
      
      console.log('Firebase 연결 테스트 성공');
      return true;
    } catch (error) {
      console.error('Firebase 연결 테스트 실패:', error);
      return false;
    }
  };

  // 회원가입
  async function register(email: string, password: string, name: string, phone?: string, address?: string) {
    try {
      console.log('회원가입 시작:', { email, name });
      
      if (!isFirebaseConfigured()) {
        console.error('Firebase 설정 상태:', {
          auth: !!auth,
          app: !!auth?.app,
          projectId: auth?.app?.options?.projectId
        });
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

      console.log('Firebase 회원가입 시도 중...');
      // Firebase 회원가입 (타임아웃 추가)
      const signupPromise = createUserWithEmailAndPassword(auth, email, password);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('회원가입 요청 시간 초과')), 30000)
      );
      
      const { user } = await Promise.race([signupPromise, timeoutPromise]) as any;
      console.log('Firebase 회원가입 성공:', user.uid);
      
      // 프로필 업데이트
      console.log('프로필 업데이트 중...');
      await updateProfile(user, { displayName: name });
      console.log('프로필 업데이트 완료');
      
      // Firestore에 사용자 데이터 저장
      const userDocData: UserData = {
        uid: user.uid,
        email: user.email!,
        name,
        phone: phone || '',
        address: address || '',
        createdAt: new Date().toISOString()
      };
      
      console.log('Firestore 저장 시도 중...');
      try {
        await setDoc(doc(db, 'users', user.uid), userDocData);
        console.log('Firestore 저장 성공');
      } catch (firestoreError) {
        console.warn('Firestore 저장 실패, 로컬에서 계속 진행:', firestoreError);
        // Firestore 저장이 실패해도 회원가입은 성공으로 처리
      }
      
      console.log('사용자 데이터 설정 중...');
      setUserData(userDocData);
      console.log('회원가입 완료');
    } catch (error) {
      console.error('회원가입 오류:', error);
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
        await deleteDoc(doc(db, 'users', currentUser.uid));
        console.log('Firestore 사용자 데이터 삭제 성공');
      } catch (firestoreError) {
        console.warn('Firestore 사용자 데이터 삭제 실패:', firestoreError);
      }

      // Firebase Authentication에서 사용자 삭제 (타임아웃 추가)
      console.log('Firebase Authentication 사용자 삭제 시도 중...');
      const deletePromise = deleteUser(currentUser);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('회원 탈퇴 요청 시간 초과')), 30000)
      );
      
      await Promise.race([deletePromise, timeoutPromise]);
      console.log('Firebase Authentication 사용자 삭제 성공');
      
      // 로컬 상태 초기화
      console.log('로컬 상태 초기화 중...');
      setCurrentUser(null);
      setUserData(null);
      console.log('회원 탈퇴 완료');
    } catch (error) {
      console.error('회원 탈퇴 오류:', error);
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
