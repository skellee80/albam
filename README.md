# 알밤 — 무통장 입금 전용 밤 판매 사이트

대보·포르단·옥광 햇밤을 파는 1인 판매자용 사이트다.
카드 결제 없이 **무통장 입금만** 받고, 입금 확인을 **사람이 대조하지 않는다**.

운영자가 기술에 익숙하지 않다는 전제로 만들었다. 그래서 대부분의 설계가
"손이 덜 가는 쪽"이 아니라 **"틀렸을 때 손으로 수습할 일이 없는 쪽"** 으로 기울어 있다.

| | |
|---|---|
| 배포 주소 | `https://albam--albam-416fd.us-central1.hosted.app` |
| 호스팅 | Firebase App Hosting (Blaze) — GitHub push 시 자동 빌드 |
| 저장소 | Firestore (프로덕션 모드) |
| 프레임워크 | Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 |

---

## 1. 어떻게 돌아가는가

### 입금이 자동으로 확인되는 흐름

```
손님 주문          아버지 폰                     서버
──────────         ──────────                    ──────────
주문서 작성   →    (입금대기 주문 생성)
계좌로 입금   →    은행 입금 문자 도착
                   MacroDroid가 문자에서
                   금액·입금자명·은행만 추출
                          │
                          └─ POST /api/deposit ─→  같은 이름 + 같은 금액의
                                                   입금대기 주문을 찾는다
                                                        │
                   알림으로 결과 표시  ←──────────────────┤
                                              1건  → 발송대기로 확정
                                              여러 건 → 확인필요 (관리자가 선택)
                                              0건  → 미매칭 (관리자가 연결)
```

서버는 **문자 원문을 파싱하지 않는다.** 문자 형식은 은행마다 다르고 언제든 바뀌므로,
그 부분은 폰에 있는 MacroDroid가 맡고 서버는 정제된 값 3개만 받는다.

### 손대야 하는 것이 생기면 첫 화면에 뜬다

관리자 첫 화면(`/admin`)은 위에서부터 **급한 순서**로 쌓여 있다.

1. 🔴 **확인이 필요한 입금** — 돈은 들어왔는데 주문이 안 움직이고 있는 건
2. 🟠 **재고 경고** — 다 팔렸거나 20% 이하로 남은 상품
3. 📦 **보낼 주문** — 송장번호 넣고 [발송완료] 누르면 끝
4. 📊 판매 현황과 차트

---

## 2. 로컬에서 돌려보기

Firestore 에뮬레이터를 쓰므로 **실제 데이터를 건드리지 않고 과금도 없다.**
(에뮬레이터에는 Java가 필요하다)

```bash
npm install
cp .env.local.example .env.local

npm run emulators   # 터미널 1 — Firestore 에뮬레이터
npm run seed        # 터미널 2 — 상품 9종 + 기본 설정 넣기
npm run dev         # http://localhost:3000
```

관리자 로그인 비밀번호는 `.env.local` 의 `ADMIN_PASSWORD` (기본 `test1234`).

### 확인용 명령

```bash
npm run smoke   # 가격 재계산·입금 매칭·재고 복원 등 핵심 로직 30가지 점검
npx tsc --noEmit
npm run build
```

`npm run smoke` 는 에뮬레이터에서만 돌아간다(실 데이터 삭제 사고 방지).
주문/입금 컬렉션을 비우고 다시 채우므로 **운영 데이터에는 절대 쓰지 말 것.**

---

## 3. 처음 배포하기

### 3-1. GitHub에 올리기

```bash
git remote add origin https://github.com/skellee80/albam.git
git branch -M main
git push -u origin main
```

### 3-2. 시크릿 3개 등록

비밀번호와 토큰은 소스에 두지 않는다. Secret Manager에 넣고 `apphosting.yaml` 이 이름으로 참조한다.

```bash
firebase login
firebase use albam-416fd

firebase apphosting:secrets:set albam-admin-password     # 관리자 비밀번호
firebase apphosting:secrets:set albam-session-secret     # 세션 서명 키 (아래 참고)
firebase apphosting:secrets:set albam-macrodroid-token   # MacroDroid 인증 토큰
```

`albam-session-secret` 과 `albam-macrodroid-token` 은 사람이 외울 필요가 없다.
길고 무작위인 값을 쓴다:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **관리자 비밀번호만** 아버지가 기억할 수 있는 값으로 정한다.
> 폰에서는 한 번만 입력하면 6개월간 유지된다.

### 3-3. App Hosting 백엔드 만들기

```bash
firebase apphosting:backends:create --project albam-416fd
```

물어보는 대로 고르면 된다.

- 리전: `us-central1`
- GitHub 저장소: `skellee80/albam` (Firebase GitHub 앱 권한 승인 필요)
- 라이브 브랜치: `main`
- 백엔드 ID: `albam`

이후 `main` 에 push할 때마다 자동으로 빌드·배포된다.

### 3-4. Firestore 규칙과 인덱스 올리기

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

> **보안 규칙은 모든 클라이언트 접근을 막는다.** 실수가 아니다.
> 이 앱은 브라우저에서 Firestore에 직접 붙지 않고, 모든 읽기·쓰기를 서버(Admin SDK)가 한다.
> 덕분에 규칙을 잘못 써서 주문·연락처·주소가 새어 나갈 경로 자체가 없다.

### 3-5. 첫 데이터 넣기

배포 후 `/admin` 에 들어가

1. **설정** 에서 입금 계좌와 문의 전화번호를 실제 값으로 바꾼다.
2. **상품·재고** 에서 가격과 재고를 실제 값으로 채운다.

상품 9종을 코드로 한 번에 넣으려면, `.env.local` 에서 `FIRESTORE_EMULATOR_HOST` 를 지우고
`gcloud auth application-default login` 후 `npm run seed` 를 돌린다.
가격과 사진은 **임시값**이므로 관리자 화면에서 바꿔야 한다.

---

## 4. MacroDroid 설정 (아버지 폰)

이 부분이 사이트에서 가장 중요하다. 한 번 맞춰 놓으면 다시 손댈 일이 없다.

### 매크로 구성

**트리거** — `SMS 수신` (발신자를 은행 번호로 한정하면 더 안전하다)

**동작 1~3: 문자에서 값 뽑기**

`정규식 일치` 또는 `변수 설정` 으로 아래 3개를 각각 변수에 담는다.

| 변수 | 담을 값 | 예 |
|---|---|---|
| `amount` | 입금액 | `50,000` 또는 `50000` |
| `name` | 입금자명 | `홍길동` |
| `bank` | 은행 이름 | `농협` |

문자 형식이 은행마다 달라서 정규식은 실제 받은 문자를 보고 맞춰야 한다.
예를 들어 `농협 입금 50,000원 홍길동` 형태라면:

- 금액: `입금\s*([\d,]+)원`
- 이름: `원\s*([가-힣]+)`

> 금액에 쉼표(`,`)나 `원` 이 섞여 있어도 서버가 숫자만 뽑아내므로 그대로 보내도 된다.

**동작 4: HTTP 요청**

| 항목 | 값 |
|---|---|
| 방식 | `POST` |
| URL | `https://albam--albam-416fd.us-central1.hosted.app/api/deposit` |
| Content Type | `application/json` |
| 본문 | 아래 |

```json
{"token":"등록한_MACRODROID_토큰","amount":"[lv=amount]","name":"[lv=name]","bank":"[lv=bank]"}
```

`[lv=...]` 자리에는 MacroDroid의 변수 삽입 기능으로 위에서 만든 변수를 넣는다.

**POST를 쓰는 이유**: 한글 이름을 주소창(GET)에 그대로 넣으면 기기에 따라 요청이
깨질 수 있다. 본문으로 보내면 그 문제가 없다.

**동작 5: 응답을 알림으로 표시**

HTTP 요청 동작에서 **응답을 변수에 저장** 을 켜고(`response` 라고 하자),
`알림 표시` 동작에서 그 변수를 본문으로 넣는다.

그러면 입금 문자가 올 때마다 이런 알림이 뜬다.

```
✅ 확정: 홍길동님 50,000원 → 발송대기 (대보 중 2)
⚠️ 확인필요: 홍길동 50,000원, 후보 2건. 관리자에서 선택하세요.
❓ 미매칭: 홍길동 50,000원. 관리자에서 확인하세요.
```

`✅` 면 아무것도 안 해도 된다. `⚠️`·`❓` 면 `/admin` 첫 화면에서 처리한다.

### 설정이 맞는지 확인하기

컴퓨터에서 아래를 실행해 본다. (`미매칭` 이 나오면 연결은 정상이다)

```bash
curl -X POST https://albam--albam-416fd.us-central1.hosted.app/api/deposit \
  -H "content-type: application/json" \
  -d '{"token":"등록한_토큰","amount":"1","name":"연결테스트","bank":"테스트"}'
```

`❌ 인증 실패` 가 나오면 토큰이 다른 것이다.

### 같은 문자가 두 번 와도 괜찮다

금액·이름·은행·시각(분)을 조합한 값을 문서 ID로 써서, 2분 안에 들어온 같은 입금은
자동으로 한 번만 처리된다. 두 번째 요청에는 처음과 똑같은 문구를 그대로 돌려준다.

---

## 5. 관리자 화면 쓰는 법

### 폰 홈화면에 아이콘 만들기

`/admin` 에서 브라우저 메뉴 → **홈 화면에 추가**.
앱처럼 열리고, 한 번 로그인하면 6개월간 유지된다.

### 자주 하는 일

| 하고 싶은 것 | 어디서 |
|---|---|
| 택배 부치고 발송 처리 | 첫 화면 → 보낼 주문 → 송장번호 입력 → **발송완료** |
| 입금이 애매할 때 | 첫 화면 맨 위 빨간 영역에서 주문 고르기 |
| 재고 채우기 | 상품·재고 → 수량 입력 → **재고 채우기** |
| 주소·수량·가격 고치기 | 주문 → 해당 주문 → 고치고 **저장하기** |
| 환불 | 실제로 송금한 뒤 → 주문에서 환불액 적고 상태를 **환불완료** 로 |
| 계좌 바꾸기 | 설정 |

### 재고에 대해

- 재고는 **주문이 들어온 순간** 빠진다. 입금 전이라도 자리를 잡아 둔다.
  무통장은 입금까지 시간이 걸리는데 그 사이 초과 판매가 나면 수습할 방법이 없기 때문이다.
- 주문을 **취소**하거나 **환불완료**로 바꾸면 재고가 자동으로 돌아온다.
  같은 조작을 여러 번 해도 재고가 이상해지지 않는다.
- 재고가 0이면 손님 화면에 **품절**로 뜨고 주문이 막힌다.

---

## 6. 시크릿 바꾸기

관리자 비밀번호나 MacroDroid 토큰을 바꿀 때:

```bash
firebase apphosting:secrets:set albam-admin-password
```

새 버전이 만들어지고, **다음 배포부터** 적용된다. 바로 반영하려면 빈 커밋을 밀어 재배포한다.

```bash
git commit --allow-empty -m "chore: 시크릿 갱신 반영"
git push
```

`albam-session-secret` 을 바꾸면 기존 로그인 세션이 모두 풀려서 다시 로그인해야 한다.

---

## 7. 구조

```
apphosting.yaml           App Hosting 설정 + 시크릿 참조
firestore.rules           클라이언트 접근 전면 차단
firestore.indexes.json    복합 인덱스 4개
scripts/
  seed.ts                 상품 9종 + 기본 설정
  smoke.ts                핵심 로직 점검 (에뮬레이터 전용)
  generate-icons.mjs      icon.svg → PWA용 PNG
src/
  app/
    (shop)/               / · /order · /track  (손님)
    admin/
      login/              로그인 (관리자 껍데기 없음)
      (panel)/            대시보드 · 주문 · 상품 · 설정
    api/deposit/          MacroDroid 수신
  components/             화면 조각
  lib/
    orders.ts             주문 생성·수정·재고 동기화
    deposits.ts           입금 매칭
    products.ts settings.ts stats.ts
    auth.ts session.ts    관리자 인증
    format.ts             금액·날짜·이름 정규화
  middleware.ts           /admin 보호
```

### 알아 둘 만한 결정

**클라이언트는 Firestore에 직접 붙지 않는다.** 모든 데이터 접근이 서버를 거친다.
그래서 보안 규칙이 "전부 거부" 한 줄로 끝나고, 가격 조작이나 남의 주문 조회가 구조적으로 불가능하다.
`/order` 는 상품 ID와 수량만 받고 금액은 서버가 상품 문서를 다시 읽어 계산한다.

**재고 복원에 플래그를 쓰지 않는다.** "이 주문이 지금 잡고 있어야 할 재고"를 상태에서
매번 다시 계산하고 그 차이만 반영한다(`orders.ts` 의 `reservationOf`).
상태를 몇 번을 왔다 갔다 해도 이중 복원·이중 차감이 원리적으로 생기지 않는다.

**집계 테이블이 없다.** 차트와 통계는 주문 문서를 그때그때 합산한다.
1인 판매 규모라 성능 문제가 없고, 집계가 어긋나도 고칠 사람이 없기 때문이다.

---

## 8. 아직 안 한 것

- **우체국 배송조회 연동** — 송장번호는 저장·표시만 한다. 나중에 조회 API를 붙일 때
  `src/components/TrackingNumber.tsx` 안에서만 고치면 되도록 분리해 두었다.
- **상품 사진과 확정 가격** — 지금은 임시 일러스트와 임시 가격이다.
  사진은 관리자 화면에서 이미지 주소를 바꿔 교체할 수 있다.
- **품종 소개 문구** — `src/app/(shop)/page.tsx` 의 `VARIETY_NOTE` 에 있는 임시 문구다.
  실제 상품에 맞게 고쳐야 한다.
