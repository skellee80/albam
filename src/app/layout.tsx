import type { Metadata, Viewport } from 'next';
import { Gowun_Dodum, IBM_Plex_Sans_KR } from 'next/font/google';

import { BRAND } from '@/lib/brand';

import './globals.css';

/**
 * 표제용 고운돋움 + 본문용 IBM Plex Sans KR.
 * next/font가 빌드 때 받아서 우리 도메인에서 서빙하므로 외부 폰트 CDN에 의존하지 않는다.
 *
 * subsets에 'korean'을 적지 않는 이유:
 * 구글 폰트는 한글 폰트를 unicode-range로 잘게 나눠서 내려준다(이 두 폰트는 각각 95/188 조각).
 * subset 파라미터와 무관하게 한글 조각이 전부 포함되므로 'latin'만 적어도 한글이 정상 표시되고,
 * 브라우저는 페이지에 실제로 쓰인 글자에 해당하는 조각만 받아간다.
 * (next/font 타입 정의에는 'korean'이 아예 없어서 적으면 타입 에러가 난다)
 */
const displayFace = Gowun_Dodum({
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
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    // 홈화면 아이콘 밑에 붙는 글자라 길면 잘린다
    title: BRAND.short,
  },
  // 파비콘은 public/icon.svg 를 가리킨다.
  // src/app/icon.svg 로도 두면 Next가 같은 /icon.svg 경로를 두 번 만들어 500이 난다
  // (conflicting public file and page file). 애플 아이콘만 파일 규칙(src/app/apple-icon.png)을 쓴다.
  icons: { icon: '/icon.svg' },
  // 주문 페이지가 검색에 뜰 이유가 없다. 상품 목록만 노출한다.
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#6F9A57',
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
