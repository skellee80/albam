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

  // Firebase 연결 상태 확인
  const isFirebaseConfigured = () => {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    };
    
    // 환경변수가 설정되지 않았거나 데모 값인 경우
    // 임시로 Firebase 사용 안함 - localStorage 시스템 테스트용
    return false; // config.apiKey && 
           // config.authDomain && 
           // config.projectId &&
           // config.apiKey !== "demo-api-key" &&
           // config.apiKey !== "AIzaSyC_UBILTyP5hLYszfcwBws_GuHTUWaY3hI";
  };

  // 회원가입
  async function register(email: string, password: string, name: string, phone?: string, address?: string) {
    try {
      // Firebase가 제대로 설정되지 않은 경우 localStorage 사용
      if (!isFirebaseConfigured()) {
        console.log('Firebase 미설정 - localStorage 사용');
        
        // localStorage 기반 회원가입
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const existingUser = existingUsers.find((u: any) => u.email === email);
        
        if (existingUser) {
          throw { code: 'auth/email-already-in-use' };
        }

        const newUser: UserData = {
          uid: Date.now().toString(),
          email,
          name,
          phone: phone || '',
          address: address || '',
          createdAt: new Date().toISOString()
        };

        existingUsers.push(newUser);
        localStorage.setItem('users', JSON.stringify(existingUsers));
        localStorage.setItem(`password_${newUser.uid}`, password);
        
        // 가짜 Firebase User 객체 생성
        const mockUser = {
          uid: newUser.uid,
          email: newUser.email,
          displayName: newUser.name,
          emailVerified: false
        } as any;

        setCurrentUser(mockUser);
        setUserData(newUser);
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        return;
      }

      // 실제 Firebase 회원가입
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
    try {
      // Firebase가 제대로 설정되지 않은 경우 localStorage 사용
      if (!isFirebaseConfigured()) {
        console.log('Firebase 미설정 - localStorage 로그인');
        
        const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
        const user = existingUsers.find((u: any) => u.email === email);
        
        if (!user) {
          throw { code: 'auth/user-not-found' };
        }

        const storedPassword = localStorage.getItem(`password_${user.uid}`);
        if (storedPassword !== password) {
          throw { code: 'auth/wrong-password' };
        }

        // 가짜 Firebase User 객체 생성
        const mockUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.name,
          emailVerified: false
        } as any;

        setCurrentUser(mockUser);
        setUserData(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        return;
      }

      // 실제 Firebase 로그인
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
    localStorage.removeItem('currentUser');
    
    // Firebase가 제대로 설정되지 않은 경우 localStorage만 정리
    if (!isFirebaseConfigured()) {
      return Promise.resolve();
    }
    
    return signOut(auth);
  }

  // 비밀번호 재설정
  async function resetPassword(email: string): Promise<void> {
    // Firebase가 제대로 설정되지 않은 경우 localStorage 기반 처리
    if (!isFirebaseConfigured()) {
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const user = existingUsers.find((u: any) => u.email === email);
      
      if (!user) {
        throw { code: 'auth/user-not-found' };
      }

      // 임시 비밀번호 생성
      const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem(`password_${user.uid}`, tempPassword);
      
      // 실제로는 이메일 발송이지만, 여기서는 alert로 표시
      alert(`임시 비밀번호가 발급되었습니다.\n\n임시 비밀번호: ${tempPassword}\n\n로그인 후 반드시 비밀번호를 변경해주세요.`);
      return;
    }

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
    // Firebase가 제대로 설정되지 않은 경우 localStorage에서 사용자 정보 로드
    if (!isFirebaseConfigured()) {
      console.log('Firebase 미설정 - localStorage에서 사용자 정보 로드');
      
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          const mockUser = {
            uid: userData.uid,
            email: userData.email,
            displayName: userData.name,
            emailVerified: false
          } as any;
          
          setCurrentUser(mockUser);
          setUserData(userData);
        } catch (error) {
          console.error('사용자 데이터 로드 오류:', error);
        }
      }
      setLoading(false);
      return;
    }

    // 실제 Firebase Auth 상태 변경 감지
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
