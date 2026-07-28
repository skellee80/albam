import Link from 'next/link';

import { BrandTitle } from './BrandTitle';

/**
 * 고객 화면 공통 헤더.
 * 아래 경계는 밤송이 가시 모양(.burr-edge)으로 끊는다 — 이 사이트의 시그니처라 여기서만 쓴다.
 */
export function SiteHeader({ active }: { active: 'shop' | 'track' | null }) {
  return (
    <header className="burr-edge bg-burr-pale text-ink">
      {/*
        아래 여백(pb)은 밤송이 가시(.burr-edge::after, 12px)가 메뉴를 덮지 않을 만큼만 둔다.
        가게 이름이 작아지면서 예전 여백은 초록 띠만 두껍게 남겼다.
      */}
      <div className="mx-auto flex w-full max-w-[30rem] flex-col items-center px-5 pt-3 pb-4">
        <BrandTitle />

        <nav className="mt-2 flex justify-center gap-2" aria-label="주요 메뉴">
          <NavLink href="/" label="상품" isActive={active === 'shop'} />
          <NavLink href="/track" label="주문 조회" isActive={active === 'track'} />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      // 바탕이 연해졌으므로 고른 칸은 진한 초록으로 채워야 눈에 든다.
      // 흰 배경으로 두면 종이색과 섞여 무엇이 골라졌는지 안 보인다.
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        isActive
          ? 'bg-burr-deep text-white'
          : 'bg-white/70 text-burr-deep hover:bg-white'
      }`}
    >
      {label}
    </Link>
  );
}
