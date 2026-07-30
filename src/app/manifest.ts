import type { MetadataRoute } from 'next';

import icon192 from '@/assets/icon-192.png';
import icon512 from '@/assets/icon-512.png';
import iconMaskable from '@/assets/icon-maskable-512.png';
import { BRAND } from '@/lib/brand';

/**
 * PWA 매니페스트. `/manifest.webmanifest` 로 나간다.
 *
 * **왜 public/manifest.webmanifest 가 아니라 코드인가**
 *
 * App Hosting 에 배포하면 `public/` 에 **새로 넣은 파일이 안 실린다.** 코드는 최신인데
 * 파일만 옛것이라, 로컬에서는 200 이고 배포된 사이트에서만 404 가 났다. 빌드 캐시를
 * 깨봐도, 하위 폴더로 옮겨봐도 그대로였다.
 *
 * 그래서 파일에 기대지 않는 길로 바꿨다.
 *  - 이 파일은 **라우트**라 빌드에 딸려 나간다 (src/app/apple-icon.png 가 잘 나오는 것과 같다)
 *  - 아이콘은 src/assets 에서 **import** 한다 → `/_next/static/media/…` 로 번들에 들어간다
 *    (글꼴·자바스크립트가 그 경로로 잘 나오고 있으니 확실하다)
 *
 * 손님 상품 사진(public/products/)은 아직 이 방식이 아니다. 이미 올라가 있는 것은
 * 나오지만, **새 사진을 넣었는데 손님 화면에서 안 보이면 이 문제다.**
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.full,
    short_name: BRAND.short,
    description: '칠갑산 석촌 햇 밤 주문과 발송을 관리합니다.',
    // 아버지가 홈 화면 아이콘을 누르면 곧바로 "오늘 할 일"이 열린다
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    background_color: '#FFFCF4',
    // 머리띠와 같은 색. 앱처럼 열었을 때 상태 표시줄까지 한 덩어리로 보인다.
    theme_color: '#D8ECCA',
    lang: 'ko',
    orientation: 'portrait',
    icons: [
      { src: icon192.src, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon512.src, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: iconMaskable.src, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
