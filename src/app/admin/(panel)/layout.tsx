import type { Metadata } from 'next';

import { AdminNav } from '@/components/admin/AdminNav';

export const metadata: Metadata = {
  title: '관리자',
  robots: { index: false, follow: false },
};

/**
 * 관리자 화면 공통 틀.
 *
 * 로그인 화면(/admin/login)은 이 레이아웃 밖에 있어서 이 껍데기가 씌워지지 않는다.
 * 고객 화면의 밤송이 가시 테두리는 여기서 쓰지 않는다 — 시그니처는 한 군데서만.
 *
 * 글자와 버튼을 고객 화면보다 크게 잡는다. 사용자가 한 명이고, 폰으로 급하게 누른다.
 */
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper text-[1.02rem]">
      <AdminNav />
      <main className="mx-auto w-full max-w-[46rem] px-4 py-5">{children}</main>
    </div>
  );
}
