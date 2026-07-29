# albam.web.app — 짧은 주소

`albam.web.app` 은 자기 파일을 갖지 않는다. 요청을 App Hosting 으로 넘기기만 한다.
Firebase Hosting 은 배포할 때 올릴 폴더를 반드시 지정해야 해서 이 빈 폴더가 있다.

**여기에 파일을 넣지 말 것.** 넣으면 그 파일이 App Hosting 보다 먼저 잡혀 사이트가 이상해진다.

## 지금은 "넘겨보내기"(302 redirect) 다

손님이 `albam.web.app` 을 치면 브라우저가 긴 주소로 튕겨 간다.
사이트는 정상으로 열리지만 **주소창에는 긴 주소가 보인다.**

```
albam.web.app         →(튕김)→  albam--albam-416fd.asia-east1.hosted.app
albam.web.app/track   →(튕김)→  albam--...hosted.app/track      ← 경로도 따라간다
```

> `"source": "**"` 에 `:splat` 을 쓰면 **규칙이 통째로 무시되어 404 가 난다.**
> (배포는 되고 설정도 올라가는데 서빙에서 안 먹는다)
> `/:path*` 처럼 세그먼트 캡처를 쓸 것. 루트(`/`)는 그 규칙에 안 걸려 따로 한 줄 더 둔다.

## 주소를 짧게 유지하려면

주소창에도 `albam.web.app` 이 남게 하려면 튕기지 말고 **뒤에서 받아와야** 한다(rewrite).
그러려면 App Hosting 의 Cloud Run 서비스가 바깥에서 불릴 수 있어야 하는데 기본값은 막혀 있다.
그대로 rewrite 로 두면 403 이 난다.

> ❌ **App Hosting 의 "커스텀 도메인 추가" 로는 안 된다.**
> 그 칸은 `.com` 처럼 **직접 소유한 도메인**만 받는다. `.web.app` 은 구글 것이라
> 소유 확인(DNS)을 할 수 없어 "유효한 서픽스가 있어야 합니다" 로 거절된다.

### 방법 1. Cloud Run 을 공개로 열기

**Google Cloud 콘솔** (Firebase 콘솔이 아니다) 에서 한 번만 하면 된다.

1. https://console.cloud.google.com/run?project=albam-416fd
2. 서비스 목록에서 **albam** 을 누른다
3. 위쪽 **보안** 탭 → **인증** → **인증되지 않은 호출 허용** 을 고르고 저장
   (탭이 안 보이면 **권한** → **주 구성원 추가** → 새 주 구성원 `allUsers`,
   역할 **Cloud Run 호출자** → 저장)
4. firebase.json 의 `redirects` 를 아래 `rewrites` 로 바꾸고 `firebase deploy --only hosting`

```json
"rewrites": [{ "source": "**", "run": { "serviceId": "albam", "region": "asia-east1" } }]
```

Cloud Run 주소(`*.run.app`)도 함께 공개된다. 어차피 공개 사이트라 새로 새는 정보는
없지만, 같은 사이트로 가는 주소가 하나 더 생긴다는 것은 알아 둘 것.
배포를 몇 번 한 뒤 이 설정이 그대로인지 한 번 확인해 보는 것이 좋다.

### 방법 2. 진짜 도메인을 사기

`chilgapbam.com` 같은 도메인을 사면(연 1만원대) App Hosting 의 **커스텀 도메인 추가**가
정상으로 동작하고, 주소창도 그대로 유지된다. 가게 이름을 알리기에도 이쪽이 낫다.

> ⚠️ 어느 쪽이든, 콘솔에서 도메인을 붙인 뒤에는 **`firebase deploy --only hosting` 을
> 다시 돌리지 말 것.** 이 폴더의 설정이 콘솔이 잡아 둔 것을 덮어쓴다.
> 그때는 firebase.json 의 `hosting` 부분을 지우는 편이 낫다.
