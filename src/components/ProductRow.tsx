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
  price: number;
  stock: number;
};

export function ProductRow({ product }: { product: ShopProduct }) {
  const { add, items } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  /**
   * **이미 장바구니에 담은 수량은 재고에서 빼야 한다.**
   *
   * 예전에는 재고만 보고 상한을 정했다. 재고가 1개일 때 1개를 담아도 화면의 재고는
   * 그대로 1개라, 담기를 누를 때마다 1개씩 계속 담을 수 있었다. 주문 단계에서 서버가
   * 막아주긴 하지만, 손님은 다 담고 이름·주소까지 적은 뒤에야 그 사실을 알게 된다.
   */
  const inCart = items.find((i) => i.productId === product.id)?.qty ?? 0;
  const remaining = Math.max(0, product.stock - inCart);

  const soldOut = product.stock <= 0;
  /** 재고는 있지만 남은 만큼 이미 다 담은 상태 */
  const allTaken = !soldOut && remaining <= 0;
  const lowStock = !soldOut && !allTaken && remaining <= LOW_STOCK_NOTICE_THRESHOLD;
  const max = Math.max(1, remaining);

  // 다른 화면(장바구니)에서 수량을 늘려 남은 수가 줄면 여기 고른 수량도 따라 줄인다
  useEffect(() => {
    setQty((q) => Math.min(q, Math.max(1, remaining)));
  }, [remaining]);

  function handleAdd() {
    const amount = Math.min(qty, remaining);
    if (amount <= 0) return;
    add({ productId: product.id, name: product.name, price: product.price }, amount);
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

      <div className="mt-2 flex items-center justify-between gap-3">
        {/* 재고가 얼마 안 남았을 때만 숫자를 드러낸다 */}
        <p
          className={`text-[0.8rem] ${
            allTaken ? 'font-semibold text-burr-deep' : lowStock ? 'font-semibold text-amber' : 'text-ink-faint'
          }`}
        >
          {allTaken ? `남은 ${product.stock}개를 모두 담았습니다` : stockNotice(remaining)}
        </p>

        {soldOut ? (
          <span className="rounded-full bg-line px-4 py-2 text-sm font-semibold text-ink-soft">
            품절
          </span>
        ) : allTaken ? (
          <span className="rounded-full bg-burr-tint px-4 py-2 text-sm font-semibold text-burr-deep">
            담기 완료
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
