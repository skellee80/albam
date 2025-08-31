'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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

  // 회원가입
  async function register(email: string, password: string, name: string, phone?: string, address?: string) {
    try {
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
      
      await setDoc(doc(db, 'users', user.uid), userDocData);
      setUserData(userDocData);
    } catch (error) {
      console.error('회원가입 오류:', error);
      throw error;
    }
  }

  // 로그인
  async function login(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }

  // 로그아웃
  async function logout() {
    setUserData(null);
    return signOut(auth);
  }

  // 비밀번호 재설정
  async function resetPassword(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  // 사용자 데이터 업데이트
  function updateUserData(data: Partial<UserData>) {
    if (userData) {
      setUserData({ ...userData, ...data });
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
        await setDoc(doc(db, 'users', user.uid), defaultUserData);
        setUserData(defaultUserData);
      }
    } catch (error) {
      console.error('사용자 데이터 로드 오류:', error);
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
    updateUserData,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
