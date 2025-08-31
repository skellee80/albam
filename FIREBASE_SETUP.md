# 🔥 Firebase Authentication 설정 가이드

## 📋 현재 상태
Firebase Authentication이 성공적으로 연동되었습니다! 이제 Firebase 콘솔에서 프로젝트를 설정하고 환경 변수를 추가하면 됩니다.

## 🚀 Firebase 프로젝트 설정

### 1단계: Firebase 콘솔 접속
1. [Firebase 콘솔](https://console.firebase.google.com) 접속
2. "프로젝트 추가" 클릭 또는 기존 프로젝트 선택

### 2단계: Authentication 활성화
1. 좌측 메뉴에서 "Authentication" 클릭
2. "시작하기" 버튼 클릭
3. "Sign-in method" 탭 선택
4. "이메일/비밀번호" 클릭하여 활성화
5. "사용 설정" 토글을 켜고 "저장" 클릭

### 3단계: Firestore 데이터베이스 설정
1. 좌측 메뉴에서 "Firestore Database" 클릭
2. "데이터베이스 만들기" 클릭
3. "테스트 모드에서 시작" 선택 (나중에 보안 규칙 설정)
4. 위치 선택 (asia-northeast3 - 서울 권장)

### 4단계: 웹 앱 등록
1. 프로젝트 개요 페이지로 이동
2. "웹" 아이콘 (</>) 클릭
3. 앱 닉네임 입력 (예: "칠갑산 알밤 농장")
4. "Firebase Hosting도 설정" 체크 (선택사항)
5. "앱 등록" 클릭

### 5단계: 설정 정보 복사
Firebase SDK 설정 정보가 표시됩니다:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

## 🔧 환경 변수 설정

### `.env.local` 파일 생성
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

**⚠️ 중요**: 위의 값들을 Firebase 콘솔에서 복사한 실제 값으로 교체해주세요!

## 🔒 Firestore 보안 규칙 설정

### 기본 보안 규칙
Firestore Database > 규칙 탭에서 다음 규칙을 설정하세요:

```javascript
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

## 🧪 테스트 방법

### 1. 개발 서버 시작
```bash
npm run dev
```

### 2. 회원가입 테스트
1. `/auth` 페이지 접속
2. "회원가입" 탭 선택
3. 이름, 전화번호, 주소, 이메일, 비밀번호 입력
4. "회원가입" 버튼 클릭
5. Firebase 콘솔 > Authentication > Users에서 사용자 확인

### 3. 로그인 테스트
1. 등록한 이메일과 비밀번호로 로그인
2. 홈페이지에서 "안녕하세요, [이름]님!" 메시지 확인
3. 마이페이지에서 사용자 정보 확인

### 4. 비밀번호 재설정 테스트
1. 로그인 페이지에서 "비밀번호를 잊으셨나요?" 클릭
2. 등록된 이메일 입력
3. 이메일로 비밀번호 재설정 링크 수신 확인

## 🔄 기존 localStorage 데이터 마이그레이션

기존에 localStorage에 저장된 사용자 데이터가 있다면, 다음 스크립트를 사용하여 Firebase로 마이그레이션할 수 있습니다:

```javascript
// 브라우저 콘솔에서 실행
async function migrateLocalStorageToFirebase() {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  
  for (const user of users) {
    try {
      // Firebase Authentication에 사용자 생성
      const password = localStorage.getItem(`password_${user.id}`) || 'temp123456';
      
      console.log(`마이그레이션 중: ${user.email}`);
      // 실제 마이그레이션은 서버 사이드에서 Admin SDK를 사용해야 합니다
    } catch (error) {
      console.error(`마이그레이션 실패: ${user.email}`, error);
    }
  }
}

// migrateLocalStorageToFirebase();
```

## 📊 Firebase 콘솔에서 확인할 수 있는 것들

### Authentication
- 등록된 사용자 목록
- 로그인 방법별 통계
- 사용자 활동 로그

### Firestore Database
- `users` 컬렉션: 사용자 프로필 정보
- `orders` 컬렉션: 주문 데이터 (향후 추가)
- 실시간 데이터 변경 모니터링

### Analytics (선택사항)
- 사용자 행동 분석
- 페이지 방문 통계
- 전환율 추적

## 🚨 주의사항

1. **환경 변수 보안**: `.env.local` 파일은 절대 Git에 커밋하지 마세요
2. **API 키 제한**: Firebase 콘솔에서 API 키 사용 제한 설정 권장
3. **보안 규칙**: 프로덕션 배포 전 보안 규칙 철저히 검토
4. **백업**: 정기적인 Firestore 데이터 백업 설정
5. **모니터링**: Firebase 사용량 및 비용 모니터링

## 🎉 완료!

모든 설정이 완료되면:
- ✅ Firebase Authentication으로 안전한 사용자 인증
- ✅ Firestore에 사용자 데이터 저장
- ✅ 실시간 비밀번호 재설정 이메일 발송
- ✅ 확장 가능한 사용자 관리 시스템

**이제 칠갑산 알밤 농장 웹사이트가 Firebase와 완전히 연동되었습니다!** 🌰🔥
