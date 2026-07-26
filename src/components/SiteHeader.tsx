import Link from 'next/link';

/**
 * 고객 화면 공통 헤더.
 * 아래 경계는 밤송이 가시 모양(.burr-edge)으로 끊는다 — 이 사이트의 시그니처라 여기서만 쓴다.
 */
export function SiteHeader({ active }: { active: 'shop' | 'track' | null }) {
  return (
    <header className="burr-edge bg-burr text-white">
      <div className="mx-auto flex w-full max-w-[30rem] flex-col items-center px-5 pt-5 pb-8">
        <Link href="/" className="inline-flex items-baseline gap-2">
          <span className="font-display text-[1.7rem] leading-none tracking-tight">알밤</span>
          <span className="text-[0.8rem] text-white/75">햇밤 직거래</span>
        </Link>

        <nav className="mt-4 flex justify-center gap-2" aria-label="주요 메뉴">
          <NavLink href="/" label="밤 고르기" isActive={active === 'shop'} />
          <NavLink href="/track" label="배송 조회" isActive={active === 'track'} />
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
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        isActive ? 'bg-white text-burr-deep' : 'bg-white/15 text-white hover:bg-white/25'
      }`}
    >
      {label}
    </Link>
  );
}
