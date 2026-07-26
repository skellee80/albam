'use client';

import { useEffect, useRef, useState } from 'react';

import { formatKRW } from '@/lib/format';
import { LOW_STOCK_NOTICE_THRESHOLD, stockNotice } from '@/lib/types';

import { useCart } from './CartProvider';

/** 상품 목록에 필요한 것만 추린 모양. 서버에서 클라이언트로 넘기는 값이라 최소로 유지한다. */
export type ShopProduct = {
  id: string;
  /** 장바구니·주문에 남는 정식 이름 ("대보 중") */
  name: string;
  /** 묶음 안에서 이 줄에 보일 짧은 이름표 ("중") */
  label: string;
  /** 이 크기가 어떤 자리에 맞는지 한 줄 안내. 없으면 표시하지 않는다. */
  note: string;
  price: number;
  stock: number;
};

export function ProductRow({ product }: { product: ShopProduct }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= LOW_STOCK_NOTICE_THRESHOLD;
  const max = Math.max(1, product.stock);

  function handleAdd() {
    add({ productId: product.id, name: product.name, price: product.price }, qty);
    setQty(1);
    setAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1600);
  }

  return (
    <div className={`px-4 py-3.5 ${soldOut ? 'opacity-55' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[1.05rem] font-semibold">{product.label}</span>
        <span className="tnum text-[1.05rem] font-bold">{formatKRW(product.price)}</span>
      </div>

      {product.note ? (
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">{product.note}</p>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between gap-3">
        {/* 재고가 얼마 안 남았을 때만 숫자를 드러낸다 */}
        <p className={`text-[0.8rem] ${lowStock ? 'font-semibold text-amber' : 'text-ink-faint'}`}>
          {stockNotice(product.stock)}
        </p>

        {soldOut ? (
          <span className="rounded-full bg-line px-4 py-2 text-sm font-semibold text-ink-soft">
            품절
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-line bg-surface">
              <StepButton label={`${product.name} 수량 줄이기`} onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1}>
                −
              </StepButton>
              <span className="tnum w-8 text-center text-[0.95rem] font-semibold" aria-live="polite">
                {qty}
              </span>
              <StepButton label={`${product.name} 수량 늘리기`} onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max}>
                +
              </StepButton>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className={`btn min-h-11 px-5 text-sm ${added ? 'btn-quiet' : 'btn-primary'}`}
            >
              {added ? '담았어요' : '담기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-ink-soft disabled:opacity-30"
    >
      {children}
    </button>
  );
}
