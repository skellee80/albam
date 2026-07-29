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

## 주소를 짧게 유지하려면 (한 번만 하면 된다)

주소창에도 `albam.web.app` 이 남게 하려면 튕기지 말고 **뒤에서 받아와야** 한다.
그러려면 App Hosting 의 Cloud Run 서비스가 바깥에서 불릴 수 있어야 하는데,
기본값은 막혀 있다(그래서 rewrite 로 두면 403 이 난다).

**Firebase 콘솔에서 도메인을 붙이는 것이 정석이다.**

1. https://console.firebase.google.com/project/albam-416fd/apphosting
2. 백엔드 `albam` → **도메인 추가 / Add custom domain**
3. `albam.web.app` 을 고른다 (같은 프로젝트의 Hosting 사이트라 DNS 설정이 필요 없다)

> ⚠️ 콘솔에서 도메인을 붙인 뒤에는 **`firebase deploy --only hosting` 을 다시 돌리지 말 것.**
> 이 폴더의 설정(위 redirects)이 콘솔이 잡아 둔 것을 덮어써 버린다.
> 그때는 firebase.json 의 `hosting` 부분을 지우는 편이 낫다.

<details>
<summary>gcloud 가 있다면 이렇게도 된다</summary>

Cloud Run 서비스를 누구나 부를 수 있게 열고, firebase.json 의 `redirects` 를
아래 `rewrites` 로 바꿔 `firebase deploy --only hosting`.

```bash
gcloud run services add-iam-policy-binding albam \
  --region=asia-east1 --project=albam-416fd \
  --member=allUsers --role=roles/run.invoker
```

```json
"rewrites": [{ "source": "**", "run": { "serviceId": "albam", "region": "asia-east1" } }]
```

이렇게 하면 Cloud Run 주소(`*.run.app`)도 공개된다. 어차피 공개 사이트라
새로 새는 정보는 없지만, 같은 사이트로 가는 주소가 하나 더 생긴다는 것은 알아 둘 것.

</details>
