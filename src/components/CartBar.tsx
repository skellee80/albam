'use client';

import Link from 'next/link';

import { formatKRW } from '@/lib/format';

import { useCart } from './CartProvider';

/**
 * 담은 게 있을 때만 아래에서 올라오는 주문 바.
 * 비어 있으면 화면을 차지하지 않는다.
 */
export function CartBar() {
  const { ready, totalCount, totalAmount } = useCart();

  if (!ready || totalCount === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-full max-w-[30rem] px-4 pb-4">
        <Link
          href="/order"
          className="btn btn-shell w-full justify-between px-5 shadow-[0_6px_20px_rgb(58_49_41/0.22)]"
        >
          <span className="tnum text-sm font-semibold text-white/85">{totalCount}개 담김</span>
          <span className="tnum">{formatKRW(totalAmount)} 주문하기</span>
        </Link>
      </div>
    </div>
  );
}
