import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

// 관리자 이메일 목록 (환경변수에서 가져오기)
const getAdminEmails = (): string[] => {
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  return adminEmails ? adminEmails.split(',').map(email => email.trim()) : [];
};

// 기본 관리자 패스워드
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'BamShopAdmin2024!@#';

// 관리자 권한 확인
export const isAdminUser = (user: User | null): boolean => {
  if (!user || !user.email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(user.email);
};

// 관리자 로그인
export const loginAsAdmin = async (email: string, password: string): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> => {
  try {
    // 1. 관리자 이메일 확인
    const adminEmails = getAdminEmails();
    if (!adminEmails.includes(email)) {
      return {
        success: false,
        error: '관리자 권한이 없는 이메일입니다.'
      };
    }

    // 2. Firebase Auth 로그인 시도
    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (loginError: any) {
      // 계정이 없는 경우 자동 생성
      if (loginError.code === 'auth/user-not-found') {
        console.log(`관리자 계정 생성 중: ${email}`);
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Firestore에 관리자 정보 저장
        await setDoc(doc(db, 'admins', userCredential.user.uid), {
          email: email,
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        });
      } else {
        throw loginError;
      }
    }

    const user = userCredential.user;

    // 3. 이메일 인증 확인
    if (!user.emailVerified) {
      console.warn('이메일 인증이 필요하지만 관리자이므로 허용');
      // 실제 운영에서는 이메일 인증을 강제할 수 있습니다
    }

    // 4. 로그인 기록 업데이트
    try {
      await updateDoc(doc(db, 'admins', user.uid), {
        lastLogin: new Date().toISOString()
      });
    } catch (error) {
      console.warn('로그인 기록 업데이트 실패:', error);
    }

    console.log(`✅ 관리자 로그인 성공: ${email}`);
    return {
      success: true,
      user: user
    };

  } catch (error: any) {
    console.error('❌ 관리자 로그인 실패:', error);
    return {
      success: false,
      error: error.message || '로그인에 실패했습니다.'
    };
  }
};

// 관리자 로그아웃
export const logoutAdmin = async (): Promise<void> => {
  try {
    await signOut(auth);
    console.log('✅ 관리자 로그아웃 완료');
  } catch (error) {
    console.error('❌ 관리자 로그아웃 실패:', error);
  }
};

// Firestore에서 관리자 이메일 목록 관리
export const AdminEmailManager = {
  // 관리자 이메일 목록 가져오기
  async getAdminEmails(): Promise<string[]> {
    try {
      const docRef = doc(db, 'settings', 'adminEmails');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return data.emails || [];
      } else {
        // 문서가 없으면 환경변수에서 초기화
        const envEmails = getAdminEmails();
        console.log('🔧 settings/adminEmails 문서를 생성합니다...');
        await setDoc(docRef, {
          emails: envEmails,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: 'system',
          description: '관리자 이메일 목록 - Firebase Console에서 직접 편집 가능'
        });
        console.log('✅ settings/adminEmails 문서 생성 완료');
        return envEmails;
      }
    } catch (error) {
      console.error('관리자 이메일 목록 조회 실패:', error);
      return getAdminEmails(); // 환경변수 fallback
    }
  },

  // 관리자 이메일 추가
  async addAdminEmail(email: string, updatedBy: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'settings', 'adminEmails');
      await updateDoc(docRef, {
        emails: arrayUnion(email),
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy
      });
      
      console.log(`✅ 관리자 이메일 추가: ${email}`);
      return true;
    } catch (error) {
      console.error('관리자 이메일 추가 실패:', error);
      return false;
    }
  },

  // 관리자 이메일 제거
  async removeAdminEmail(email: string, updatedBy: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'settings', 'adminEmails');
      await updateDoc(docRef, {
        emails: arrayRemove(email),
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy
      });
      
      console.log(`✅ 관리자 이메일 제거: ${email}`);
      return true;
    } catch (error) {
      console.error('관리자 이메일 제거 실패:', error);
      return false;
    }
  },

  // 관리자 이메일 목록 전체 업데이트
  async updateAdminEmails(emails: string[], updatedBy: string): Promise<boolean> {
    try {
      const docRef = doc(db, 'settings', 'adminEmails');
      await setDoc(docRef, {
        emails: emails,
        updatedAt: new Date().toISOString(),
        updatedBy: updatedBy
      });
      
      console.log('✅ 관리자 이메일 목록 업데이트 완료');
      return true;
    } catch (error) {
      console.error('관리자 이메일 목록 업데이트 실패:', error);
      return false;
    }
  }
};

// 관리자 권한 확인 (Firestore 기반)
export const checkAdminPermission = async (user: User | null): Promise<boolean> => {
  if (!user || !user.email) return false;

  try {
    // 1. Firestore에서 관리자 이메일 목록 확인
    const adminEmails = await AdminEmailManager.getAdminEmails();
    if (!adminEmails.includes(user.email)) return false;

    // 2. 관리자 문서 확인
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch (error) {
    console.error('관리자 권한 확인 실패:', error);
    return false;
  }
};
