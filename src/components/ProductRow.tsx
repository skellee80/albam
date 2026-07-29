'use client';

import { useEffect, useRef, useState } from 'react';

import { formatKRW } from '@/lib/format';
import { LOW_STOCK_NOTICE_THRESHOLD, stockNotice } from '@/lib/types';

import { useCart } from './CartProvider';

/** 상품 목록에 필요한 것만 추린 모양. 서버에서 클라이언트로 넘기는 값이라 최소로 유지한다. */
export type ShopProduct = {
  id: string;
  /** 장바구니·주문에 남는 정식 이름 ("대보 중 4kg") */
  name: string;
  /** 크기 ("중"). 이름에서 뽑는다. 못 뽑으면 빈 칸. */
  size: string;
  /** 무게 ("4kg"). 이름에서 뽑는다. 못 뽑으면 빈 칸. */
  weight: string;
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
      {/*
        묶음 제목이 품종을 이미 말해 주므로 줄에는 **크기와 무게만** 적는다.
        크기는 값이 몇 개뿐이라 알약 모양으로 떼어 두면 눈이 세로로 훑기 쉽다.
        둘 다 못 읽는 이름이면 이름을 통째로 적는다 — 빈 줄이 되면 안 된다.
      */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          {product.size ? (
            <>
              <span className="shrink-0 rounded-full bg-flesh/60 px-2 py-0.5 text-[0.82rem] font-bold text-shell">
                {product.size}
              </span>
              <span className="text-[1.05rem] font-semibold">
                {product.weight || product.name}
              </span>
            </>
          ) : (
            <span className="text-[1.05rem] font-semibold">{product.name}</span>
          )}
        </span>
        <span className="tnum shrink-0 text-[1.05rem] font-bold">{formatKRW(product.price)}</span>
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
