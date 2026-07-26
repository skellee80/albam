'use client';

import { useEffect, useRef, useState } from 'react';

import { formatKRW } from '@/lib/format';

import { useCart } from './CartProvider';

/** 상품 목록에 필요한 것만 추린 모양. 서버에서 클라이언트로 넘기는 값이라 최소로 유지한다. */
export type ShopProduct = {
  id: string;
  name: string;
  size: string;
  price: number;
  stock: number;
  initialStock: number;
};

/** 재고를 정확한 숫자로 노출하면 "얼마 없네" 하고 되레 망설인다. 적을 때만 알린다. */
function stockHint(product: ShopProduct): string | null {
  if (product.stock <= 0) return null;
  if (product.initialStock > 0 && product.stock <= product.initialStock * 0.2) {
    return `${product.stock}개 남았습니다`;
  }
  return null;
}

export function ProductRow({ product }: { product: ShopProduct }) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const soldOut = product.stock <= 0;
  const max = Math.max(1, product.stock);
  const hint = stockHint(product);

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
        <span className="text-[1.05rem] font-semibold">{product.size}</span>
        <span className="tnum text-[1.05rem] font-bold">{formatKRW(product.price)}</span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className={`text-[0.8rem] ${hint ? 'text-amber' : 'text-ink-faint'}`}>
          {soldOut ? '지금은 준비된 물량이 없습니다' : (hint ?? '주문 가능')}
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
