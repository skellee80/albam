'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTransition } from 'react';

import { logoutAction } from '@/app/admin/actions';
import { BRAND } from '@/lib/brand';

const TABS = [
  { href: '/admin', label: '오늘 할 일' },
  { href: '/admin/orders', label: '주문관리' },
  { href: '/admin/products', label: '재고관리' },
  { href: '/admin/sales', label: '판매현황' },
  { href: '/admin/settings', label: '설정' },
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
        <button
          type="button"
          onClick={() => startTransition(() => logoutAction())}
          disabled={pending}
          className="rounded-full bg-white/15 px-3.5 py-2 text-[0.8rem] font-semibold"
        >
          {pending ? '나가는 중…' : '로그아웃'}
        </button>
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

          {/*
            손님 화면으로 건너가는 문. 로그아웃과는 다르다 —
            세션은 그대로 두고 상품 목록만 보러 간다(주문이 어떻게 보이는지 확인할 때 쓴다).
          */}
          <Link
            href="/"
            className="shrink-0 rounded-full border border-white/30 px-4 py-2 text-[0.88rem] font-semibold text-white/90"
          >
            나가기 ↗
          </Link>
        </div>
      </nav>
    </header>
  );
}
