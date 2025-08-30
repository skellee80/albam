# 🔥 Firebase 이메일 로그인 연동 가이드

## 📋 개요
현재 **칠갑산 알밤 농장** 웹사이트는 localStorage를 사용한 간단한 인증 시스템을 사용하고 있습니다. Firebase Authentication으로 전환하면 더 안전하고 확장 가능한 사용자 인증을 구현할 수 있습니다.

## 🚀 1단계: Firebase 프로젝트 설정

### 1.1 Firebase 콘솔에서 Authentication 활성화
```bash
# Firebase 콘솔 (https://console.firebase.google.com) 접속
1. 기존 프로젝트 선택 또는 새 프로젝트 생성
2. 좌측 메뉴에서 "Authentication" 클릭
3. "시작하기" 버튼 클릭
4. "Sign-in method" 탭에서 "이메일/비밀번호" 활성화
5. "사용자" 탭에서 테스트 사용자 추가 (선택사항)
```

### 1.2 Firebase SDK 설치
```bash
npm install firebase
```

### 1.3 Firebase 구성 파일 생성
```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Authentication 및 Firestore 인스턴스
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
```

## 🔐 2단계: 인증 컨텍스트 생성

### 2.1 AuthContext 생성
```typescript
// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
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
  }

  // 로그인
  async function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // 로그아웃
  async function logout() {
    setUserData(null);
    return signOut(auth);
  }

  // 사용자 데이터 로드
  async function loadUserData(user: User) {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      setUserData(userDoc.data() as UserData);
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
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
```

### 2.2 루트 레이아웃에 AuthProvider 추가
```typescript
// src/app/layout.tsx
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* Google Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&family=Pretendard:wght@300;400;500;600;700&family=SUIT:wght@300;400;500;600;700&family=Gowun+Dodum&family=Jua&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## 🔄 3단계: 기존 인증 로직 교체

### 3.1 로그인/회원가입 페이지 수정
```typescript
// src/app/auth/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    address: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { login, register } = useAuth();

  // 폼 유효성 검사
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.';
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 6자 이상이어야 합니다.';
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = '이름을 입력해주세요.';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호 확인을 입력해주세요.';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = '비밀번호가 일치하지 않습니다.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 인증 처리
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.email, formData.password, formData.name, formData.phone, formData.address);
      }
      
      setShowSuccessModal(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      console.error('인증 오류:', error);
      
      // Firebase 에러 메시지 처리
      let errorMessage = '오류가 발생했습니다. 다시 시도해주세요.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = '등록되지 않은 이메일입니다.';
          break;
        case 'auth/wrong-password':
          errorMessage = '비밀번호가 일치하지 않습니다.';
          break;
        case 'auth/email-already-in-use':
          errorMessage = '이미 등록된 이메일입니다.';
          break;
        case 'auth/weak-password':
          errorMessage = '비밀번호가 너무 약합니다.';
          break;
        case 'auth/invalid-email':
          errorMessage = '올바르지 않은 이메일 형식입니다.';
          break;
      }
      
      setErrors({ general: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  // ... 나머지 컴포넌트 코드
}
```

### 3.2 헤더 컴포넌트에서 useAuth 사용
```typescript
// 각 페이지의 헤더 부분
import { useAuth } from '@/contexts/AuthContext';

export default function SomePage() {
  const { currentUser, userData, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowLogoutModal(false);
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  return (
    <>
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">칠갑산 알밤 농장</Link>
          <nav className="nav">
            {/* 네비게이션 메뉴들 */}
            
            {currentUser && userData ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <div style={{
                  color: 'white', 
                  fontSize: '0.85rem', 
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)', 
                  padding: '0.4rem 0.8rem', 
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}>
                  안녕하세요, {userData.name}님! ✨
                </div>
                <Link href="/mypage" className="nav-link">👤 마이페이지</Link>
                <button onClick={() => setShowLogoutModal(true)}>로그아웃</button>
              </div>
            ) : (
              <Link href="/auth" className="nav-link">🔐 로그인</Link>
            )}
          </nav>
        </div>
      </header>
      
      {/* 페이지 내용 */}
      
      {/* 로그아웃 모달 */}
      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🌰</div>
            <div className="modal-title">안전하게 로그아웃</div>
            <div className="modal-message">
              소중한 시간을 함께해 주셔서 감사합니다.<br/>
              다음에 또 만나요!
            </div>
            <button className="modal-button" onClick={handleLogout}>
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

## 🗄️ 4단계: Firestore 데이터베이스 구조

### 4.1 사용자 컬렉션 구조
```typescript
// users/{uid}
{
  uid: string;           // Firebase Auth UID
  email: string;         // 이메일
  name: string;          // 이름
  phone: string;         // 전화번호
  address: string;       // 주소
  createdAt: string;     // 가입일
}
```

### 4.2 주문 컬렉션 구조
```typescript
// orders/{orderId}
{
  orderId: string;       // 주문 ID
  userId: string;        // 주문자 UID
  userName: string;      // 주문자 이름
  userPhone: string;     // 주문자 연락처
  recipientName: string; // 수취인 이름
  recipientPhone: string;// 수취인 연락처
  address: string;       // 배송지
  productId: string;     // 상품 ID
  productName: string;   // 상품명
  quantity: number;      // 수량
  totalPrice: number;    // 총 금액
  orderDate: string;     // 주문일
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;     // 생성일
  updatedAt: string;     // 수정일
}
```

## 🔒 5단계: Firestore 보안 규칙

### 5.1 기본 보안 규칙 설정
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자는 자신의 데이터만 읽고 쓸 수 있음
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 주문 데이터
    match /orders/{orderId} {
      // 사용자는 자신의 주문만 읽을 수 있음
      allow read: if request.auth != null && 
        (request.auth.uid == resource.data.userId || 
         request.auth.token.admin == true);
      
      // 인증된 사용자만 주문 생성 가능
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
      
      // 관리자만 주문 수정 가능
      allow update: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // 상품 데이터 (읽기 전용, 관리자만 수정)
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
  }
}
```

## 📱 6단계: 환경 변수 설정

### 6.1 .env.local 파일 생성
```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 6.2 Firebase 구성 파일 업데이트
```typescript
// src/lib/firebase.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
```

## 🚀 7단계: 배포 및 테스트

### 7.1 Firebase App Hosting 배포
```bash
# 기존 GitHub Actions 워크플로우가 자동으로 배포
git add .
git commit -m "feat: Firebase Authentication 연동"
git push origin main
```

### 7.2 테스트 시나리오
1. **회원가입 테스트**
   - 새 이메일로 회원가입
   - Firebase Console에서 사용자 확인
   - Firestore에서 사용자 데이터 확인

2. **로그인 테스트**
   - 등록된 계정으로 로그인
   - 사용자 정보 표시 확인
   - 세션 유지 확인

3. **주문 테스트**
   - 로그인 상태에서 주문 생성
   - Firestore에서 주문 데이터 확인
   - 마이페이지에서 주문 내역 확인

## 🔧 8단계: 추가 기능 구현

### 8.1 이메일 인증
```typescript
// 이메일 인증 추가
import { sendEmailVerification } from 'firebase/auth';

async function sendVerificationEmail() {
  if (currentUser && !currentUser.emailVerified) {
    await sendEmailVerification(currentUser);
    alert('인증 이메일이 발송되었습니다.');
  }
}
```

### 8.2 비밀번호 재설정
```typescript
// 비밀번호 재설정
import { sendPasswordResetEmail } from 'firebase/auth';

async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    alert('비밀번호 재설정 이메일이 발송되었습니다.');
  } catch (error) {
    console.error('비밀번호 재설정 오류:', error);
  }
}
```

### 8.3 프로필 업데이트
```typescript
// 사용자 프로필 업데이트
import { updateDoc, doc } from 'firebase/firestore';

async function updateUserProfile(userData: Partial<UserData>) {
  if (currentUser) {
    await updateDoc(doc(db, 'users', currentUser.uid), userData);
    // 로컬 상태 업데이트
    setUserData(prev => prev ? { ...prev, ...userData } : null);
  }
}
```

## 📊 9단계: 관리자 기능 구현

### 9.1 관리자 권한 설정
```bash
# Firebase CLI로 관리자 권한 설정
npm install -g firebase-tools
firebase login
firebase functions:config:set admin.emails="admin@example.com"
```

### 9.2 관리자 확인 함수
```typescript
// src/lib/admin.ts
import { auth } from './firebase';

export async function checkAdminStatus() {
  const user = auth.currentUser;
  if (!user) return false;
  
  const token = await user.getIdTokenResult();
  return !!token.claims.admin;
}
```

## 🎯 마이그레이션 체크리스트

- [ ] Firebase 프로젝트 설정 완료
- [ ] Authentication 활성화
- [ ] Firebase SDK 설치 및 구성
- [ ] AuthContext 구현
- [ ] 기존 localStorage 로직 제거
- [ ] 모든 페이지에 useAuth 적용
- [ ] Firestore 보안 규칙 설정
- [ ] 환경 변수 설정
- [ ] 테스트 완료
- [ ] 배포 완료

## 🚨 주의사항

1. **데이터 마이그레이션**: 기존 localStorage 데이터를 Firestore로 이전 필요
2. **보안 규칙**: 프로덕션 배포 전 보안 규칙 철저히 검토
3. **에러 처리**: Firebase 에러 코드에 따른 적절한 사용자 메시지 제공
4. **성능**: Firestore 읽기/쓰기 최적화로 비용 절감
5. **백업**: 정기적인 데이터 백업 설정

## 📞 지원

Firebase Authentication 연동 중 문제가 발생하면:
1. [Firebase 공식 문서](https://firebase.google.com/docs/auth) 참조
2. [Next.js Firebase 가이드](https://firebase.google.com/docs/web/setup) 확인
3. Firebase Console의 디버그 로그 확인

---

**이 가이드를 따라 구현하면 안전하고 확장 가능한 Firebase Authentication 시스템을 구축할 수 있습니다!** 🚀✨
