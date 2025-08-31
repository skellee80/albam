# 🔥 Firebase 설정 완료 가이드

## ✅ 현재 상태
- **Firebase 프로젝트**: `albam-bb07e` 연결 완료
- **웹 앱 설정**: 완료
- **코드 업데이트**: 실제 Firebase 설정으로 업데이트 완료

## 🚨 **Firebase 콘솔에서 수동 설정 필요**

### 1. Authentication 활성화
1. **Firebase 콘솔 접속**: https://console.firebase.google.com/project/albam-bb07e
2. **왼쪽 메뉴에서 "Authentication" 클릭**
3. **"시작하기" 버튼 클릭**
4. **"Sign-in method" 탭 선택**
5. **"이메일/비밀번호" 클릭하여 활성화**
6. **"사용 설정" 토글을 ON으로 변경**
7. **"저장" 클릭**

### 2. Firestore 데이터베이스 생성
1. **왼쪽 메뉴에서 "Firestore Database" 클릭**
2. **"데이터베이스 만들기" 클릭**
3. **보안 규칙 모드 선택**:
   - **테스트 모드**: 개발용 (30일 후 자동 비활성화)
   - **프로덕션 모드**: 실제 서비스용 (보안 규칙 필요)
4. **위치 선택**: `asia-northeast3 (Seoul)` 권장
5. **"완료" 클릭**

### 3. Firestore 보안 규칙 설정 (프로덕션 모드 선택 시)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자는 자신의 데이터만 읽기/쓰기 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 주문 데이터는 로그인한 사용자만 읽기 가능
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
    
    // 공지사항은 모든 사용자가 읽기 가능, 관리자만 쓰기 가능
    match /notices/{noticeId} {
      allow read: if true;
      allow write: if request.auth != null; // 추후 관리자 권한 체크 추가
    }
  }
}
```

## 🧪 **테스트 방법**

### 1. 회원가입 테스트
1. **브라우저에서 접속**: http://localhost:3000/auth
2. **"회원가입" 탭 선택**
3. **정보 입력**:
   - 이름: 홍길동
   - 전화번호: 010-1234-5678
   - 주소: 서울시 강남구
   - 이메일: test@example.com
   - 비밀번호: test123456
4. **"회원가입" 버튼 클릭**
5. **✅ 성공 시**: "🎉 로그인 성공!" 모달 표시
6. **❌ 실패 시**: 구체적인 오류 메시지 표시

### 2. Firebase 콘솔에서 확인
1. **Authentication > Users 탭**에서 새 사용자 확인
2. **Firestore Database > 데이터 탭**에서 `users` 컬렉션 확인

### 3. 로그인 테스트
1. **등록한 이메일/비밀번호로 로그인**
2. **홈페이지에서 "안녕하세요, 홍길동님!" 메시지 확인**

## 🔧 **문제 해결**

### Authentication 오류
```
FirebaseError: Firebase: Error (auth/configuration-not-found)
```
**해결**: Firebase 콘솔에서 Authentication 서비스를 활성화하세요.

### Firestore 오류
```
FirebaseError: Missing or insufficient permissions
```
**해결**: Firestore 데이터베이스를 생성하고 보안 규칙을 설정하세요.

### 네트워크 오류
```
FirebaseError: Firebase: Error (auth/network-request-failed)
```
**해결**: 인터넷 연결을 확인하고 방화벽 설정을 점검하세요.

## 📊 **현재 Firebase 설정 정보**

```javascript
// src/lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyC_UBILTyP5hLYszfcwBws_GuHTUWaY3hI",
  authDomain: "albam-bb07e.firebaseapp.com",
  projectId: "albam-bb07e",
  storageBucket: "albam-bb07e.firebasestorage.app",
  messagingSenderId: "214464229053",
  appId: "1:214464229053:web:b2cd7266cdcce7aa8851d4"
};
```

## 🎯 **다음 단계**

### 즉시 필요한 작업
1. ✅ **Firebase 콘솔에서 Authentication 활성화**
2. ✅ **Firestore 데이터베이스 생성**
3. ✅ **회원가입 테스트**

### 추가 개선사항
1. **이메일 인증**: 회원가입 시 이메일 인증 추가
2. **비밀번호 정책**: 최소 길이, 복잡도 요구사항 설정
3. **사용자 프로필 이미지**: Firebase Storage 연동
4. **관리자 권한**: 관리자 계정 구분 및 권한 관리

---

**🚀 Firebase 콘솔에서 위 설정을 완료하면 즉시 실제 Firebase Authentication을 사용할 수 있습니다!**

Firebase 콘솔 링크: https://console.firebase.google.com/project/albam-bb07e
