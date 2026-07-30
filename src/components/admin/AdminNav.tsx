'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTransition } from 'react';

import { logoutAction } from '@/app/admin/actions';
import { BRAND } from '@/lib/brand';

/**
 * 매일 쓰는 칸만 아래 줄에 둔다.
 * 설정과 나가기는 자주 쓸 것이 아니라 위쪽 로그아웃 옆으로 옮겼다 —
 * 아래 줄이 짧아야 지금 어느 화면인지 한눈에 들어온다.
 */
const TABS = [
  { href: '/admin', label: '오늘 할 일' },
  { href: '/admin/orders', label: '주문관리' },
  { href: '/admin/products', label: '재고관리' },
  { href: '/admin/sales', label: '판매현황' },
];

export function AdminNav() {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <header className="sticky top-0 z-30 bg-shell text-white shadow-sm">
      <div className="mx-auto flex w-full max-w-[46rem] items-center justify-between px-4 py-3">
        <Link href="/admin" className="font-display text-[1.3rem] leading-none">
          {BRAND.short} 관리
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/admin/settings"
            aria-current={pathname.startsWith('/admin/settings') ? 'page' : undefined}
            className={`rounded-full px-3 py-2 text-[0.8rem] font-semibold ${
              pathname.startsWith('/admin/settings') ? 'bg-white text-shell' : 'bg-white/15'
            }`}
          >
            설정
          </Link>

          {/*
            손님 화면으로 건너가는 문. 로그아웃과는 다르다 —
            세션은 그대로 두고 상품 목록만 보러 간다(주문이 어떻게 보이는지 확인할 때 쓴다).
          */}
          <Link
            href="/"
            className="rounded-full border border-white/30 px-3 py-2 text-[0.8rem] font-semibold text-white/90"
          >
            나가기 ↗
          </Link>

          <button
            type="button"
            onClick={() => startTransition(() => logoutAction())}
            disabled={pending}
            className="rounded-full bg-white/15 px-3 py-2 text-[0.8rem] font-semibold"
          >
            {pending ? '…' : '로그아웃'}
          </button>
        </div>
      </div>

      <nav className="mx-auto w-full max-w-[46rem] overflow-x-auto px-4 pb-2.5" aria-label="관리자 메뉴">
        <div className="flex gap-2">
          {TABS.map((tab) => {
            const active = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-full px-4 py-2 text-[0.88rem] font-semibold transition-colors ${
                  active ? 'bg-white text-shell' : 'bg-white/15 text-white'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
