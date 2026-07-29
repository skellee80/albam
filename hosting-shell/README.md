# albam.web.app — 짧은 주소

`albam.web.app` 은 자기 파일을 갖지 않는다. 모든 요청을 App Hosting 뒤로 넘긴다
(firebase.json 의 `hosting.rewrites`). Firebase Hosting 은 배포할 때 올릴 폴더를
반드시 지정해야 해서 이 빈 폴더가 있다.

**여기에 파일을 넣지 말 것.** 넣으면 그 파일이 App Hosting 보다 먼저 잡혀 사이트가 이상해진다.

```
albam.web.app         →  albam--albam-416fd.asia-east1.hosted.app
albam.web.app/track   →  .../track
```

**튕기지 않고 뒤에서 받아온다(rewrite).** 손님 주소창에는 `albam.web.app` 이 그대로 남는다.
긴 주소도 계속 살아 있다 — 둘 다 같은 사이트다.

## 이게 되려면 무엇이 필요했나

Firebase Hosting 이 App Hosting 의 Cloud Run 서비스를 부를 수 있어야 한다.
기본값은 막혀 있어서 그대로 두면 **403** 이 난다.

**Google Cloud 콘솔** 에서 한 번 열어 줬다 (Firebase 콘솔 아님).

1. https://console.cloud.google.com/run?project=albam-416fd
2. 서비스 **albam** → **보안** 탭 → **인증되지 않은 호출 허용**
   (또는 **권한** → 주 구성원 `allUsers`, 역할 **Cloud Run 호출자**)

> Cloud Run 주소(`*.run.app`)도 함께 공개된다. 어차피 공개 사이트라 새로 새는 정보는
> 없지만, 같은 사이트로 가는 주소가 하나 더 생긴다.
>
> ⚠️ **배포를 몇 번 한 뒤 `albam.web.app` 이 403 이 되지 않는지 한 번씩 확인할 것.**
> App Hosting 이 롤아웃 때 이 설정을 되돌리면 그때 위 절차를 다시 하면 된다.

## 안 되는 방법 (해봤다)

- **App Hosting 의 "커스텀 도메인 추가"** — 이 칸은 `.com` 처럼 **직접 소유한 도메인**만
  받는다. `.web.app` 은 구글 것이라 소유 확인(DNS)을 할 수 없어
  "유효한 서픽스가 있어야 합니다" 로 거절된다.
- **`"source": "**"` + `:splat`** — 배포도 되고 설정도 올라가는데 서빙에서 무시되어 404 가
  난다. redirect 로 쓸 일이 생기면 `/:path*` 세그먼트 캡처를 쓸 것
  (루트 `/` 는 그 규칙에 안 걸려 한 줄 더 필요하다).

## 앞으로

진짜 도메인(`chilgapbam.com` 등, 연 1~2만원)을 사면 App Hosting 의 커스텀 도메인이
정상 동작한다. 명함이나 상자에 적기에도 그쪽이 낫다. 그때는 firebase.json 의
`hosting` 부분을 지우고 이 폴더도 함께 지우면 된다.
