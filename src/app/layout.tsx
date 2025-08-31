import type { Metadata } from "next";
import { AuthProvider } from '@/contexts/AuthContext';

import "./globals.css";

export const metadata: Metadata = {
  title: "청양 칠갑산 알밤 농장 - 청양 알밤 직판장",
  description: "충남 청양에서 정성껏 재배한 알밤을 농가에서 직접 판매합니다. 신선하고 맛있는 알밤을 만나보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&family=Pretendard:wght@300;400;500;600;700&family=SUIT:wght@300;400;500;600;700&family=Gowun+Dodum&family=Jua&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
