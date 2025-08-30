# 칠갑산 알밤 농장 웹사이트

충남 청양에서 정성껏 재배한 알밤을 농가에서 직접 판매하는 온라인 직판장입니다.

## 🌰 프로젝트 소개

- **기술 스택**: Next.js 15, TypeScript, Firebase App Hosting
- **주요 기능**: 상품 관리, 주문 접수, 관리자 패널, 공지사항 관리
- **디자인**: 친화적이고 귀여운 감자꽃체 적용, 모바일 최적화

## 🚀 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

개발 서버는 [http://localhost:3000](http://localhost:3000)에서 실행됩니다.

## 📦 배포 방법

**⚠️ 중요: 로컬에서 직접 배포는 금지되어 있습니다.**

### GitHub 연동 자동 배포

1. **코드 변경 후 커밋**:
   ```bash
   git add .
   git commit -m "변경사항 설명"
   ```

2. **GitHub에 푸시**:
   ```bash
   git push origin main
   ```

3. **Cursor에서 Sync 버튼 클릭** 또는 GitHub에서 확인

4. **자동 배포**: GitHub Actions가 자동으로 Firebase App Hosting에 배포

### 배포 상태 확인

- **GitHub Actions**: [Repository Actions 탭](https://github.com/YOUR_REPO/actions)에서 배포 상태 확인
- **Firebase Console**: [Firebase App Hosting](https://console.firebase.google.com/project/albam-bb07e/apphosting)에서 배포 현황 확인
- **라이브 사이트**: [sosofamily.store](https://sosofamily.store) 또는 [Firebase URL](https://albam--albam-bb07e.asia-east1.hosted.app)

## 🛠️ 주요 기능

- **상품 관리**: 알밤 상품 추가, 수정, 삭제
- **주문 시스템**: 고객 주문 접수 및 관리
- **관리자 패널**: 주문 현황, 메모판 관리
- **공지사항**: 농장 소식 및 공지사항 관리
- **반응형 디자인**: 모바일 친화적 UI/UX

## 📱 모바일 최적화

- 세로 배치 레이아웃으로 스크롤 최적화
- 터치 친화적 버튼 및 인터페이스
- 통합 레이아웃으로 일관된 사용자 경험

## 🎨 디자인 특징

- **글꼴**: 감자꽃체로 친화적이고 귀여운 느낌
- **색상**: 부드러운 파스텔 톤의 버튼과 UI 요소
- **아이콘**: 직관적인 이모지 아이콘 사용
