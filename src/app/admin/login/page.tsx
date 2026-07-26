import type { Metadata } from 'next';

import { LoginForm } from '@/components/admin/LoginForm';
import { BRAND } from '@/lib/brand';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '관리자 로그인',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[26rem] flex-col justify-center px-5 py-10">
      <div className="text-center">
        <p className="text-[2.2rem] leading-none">🌰</p>
        <h1 className="mt-3 font-display text-[1.5rem]">{BRAND.short} 관리자</h1>
        <p className="mt-1.5 text-[0.9rem] text-ink-soft">비밀번호를 넣어 주세요.</p>
      </div>

      <LoginForm next={next ?? '/admin'} />
    </main>
  );
}
