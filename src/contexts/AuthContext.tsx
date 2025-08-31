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
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    };
    
    // Firebase 설정이 제대로 되어 있는지 확인
    return config.apiKey && 
           config.authDomain && 
           config.projectId &&
           config.apiKey !== "demo-api-key";
  };

  // 회원가입
  async function register(email: string, password: string, name: string, phone?: string, address?: string) {
    try {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase가 설정되지 않았습니다. 관리자에게 문의하세요.');
      }

      // Firebase 회원가입
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // 프로필 업데이트
      await updateProfile(user, { displayName: name });
      
      // Firestore에 사용자 데이터 저장
      const userDocData: UserData = {
        uid: user.uid,
        email: user.email!,
        name,
        phone: phone || '',
        address: address || '',
        createdAt: new Date().toISOString()
      };
      
      try {
        await setDoc(doc(db, 'users', user.uid), userDocData);
      } catch (firestoreError) {
        console.warn('Firestore 저장 실패, 로컬에서 계속 진행:', firestoreError);
        // Firestore 저장이 실패해도 회원가입은 성공으로 처리
      }
      
      setUserData(userDocData);
    } catch (error) {
      console.error('회원가입 오류:', error);
      throw error;
    }
  }

  // 로그인
  async function login(email: string, password: string): Promise<void> {
    try {
      if (!isFirebaseConfigured()) {
        throw new Error('Firebase가 설정되지 않았습니다. 관리자에게 문의하세요.');
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
    if (!currentUser) {
      throw new Error('로그인된 사용자가 없습니다.');
    }

    if (!isFirebaseConfigured()) {
      throw new Error('Firebase가 설정되지 않았습니다. 관리자에게 문의하세요.');
    }

    try {
      // Firestore에서 사용자 데이터 삭제
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid));
      } catch (firestoreError) {
        console.warn('Firestore 사용자 데이터 삭제 실패:', firestoreError);
      }

      // Firebase Authentication에서 사용자 삭제
      await deleteUser(currentUser);
      
      // 로컬 상태 초기화
      setCurrentUser(null);
      setUserData(null);
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
