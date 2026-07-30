import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_KR, Jua } from 'next/font/google';

import { BRAND } from '@/lib/brand';

import './globals.css';

/**
 * 표제용 주아(Jua) + 본문용 IBM Plex Sans KR.
 *
 * 주아는 획이 둥글고 통통해서 밤 파는 가게에 어울린다. 귀엽지만 획이 굵고 단순해서
 * 멀리서도 읽히므로, 고령 사용자가 볼 화면에 써도 무리가 없다
 * (같은 계열의 손글씨체는 획이 가늘어 그 조건을 못 맞춘다).
 *
 * 본문은 바꾸지 않는다. 주소·전화번호·금액을 정확히 읽어야 하는 자리라
 * 표제와 본문의 역할을 갈라 둔다.
 *
 * next/font가 빌드 때 받아서 우리 도메인에서 서빙하므로 외부 폰트 CDN에 의존하지 않는다.
 *
 * subsets에 'korean'을 적지 않는 이유:
 * 구글 폰트는 한글 폰트를 unicode-range로 잘게 나눠서 내려준다.
 * subset 파라미터와 무관하게 한글 조각이 전부 포함되므로 'latin'만 적어도 한글이 정상 표시되고,
 * 브라우저는 페이지에 실제로 쓰인 글자에 해당하는 조각만 받아간다.
 * (next/font 타입 정의에는 'korean'이 아예 없어서 적으면 타입 에러가 난다)
 */
const displayFace = Jua({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display-face',
  display: 'swap',
});

const bodyFace = IBM_Plex_Sans_KR({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-body-face',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: BRAND.full,
    template: `%s · ${BRAND.short}`,
  },
  description: '칠갑산 석촌에서 키운 유기농 햇 밤을 무통장 입금으로 주문하세요.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    // 홈화면 아이콘 밑에 붙는 글자라 길면 잘린다
    title: BRAND.short,
  },
  /*
    파비콘·애플 아이콘·매니페스트는 여기 적지 않는다.
    src/app/ 의 파일 규칙(icon.svg · apple-icon.png · manifest.ts)이 링크까지 알아서 넣는다.

    public/ 에 두지 않는 이유는 manifest.ts 주석 참고 —
    배포에서 새 파일이 빠져 404 가 났다.
  */
  // 주문 페이지가 검색에 뜰 이유가 없다. 상품 목록만 노출한다.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  // 머리띠와 같은 색. 폰에서 주소창까지 한 덩어리로 보인다.
  themeColor: '#D8ECCA',
  width: 'device-width',
  initialScale: 1,
  // 고령 사용자가 확대할 수 있어야 한다. maximumScale로 막지 않는다.
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={`${displayFace.variable} ${bodyFace.variable}`}>{children}</body>
    </html>
  );
}
