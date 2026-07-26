'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * 장바구니는 브라우저 localStorage에만 둔다.
 * 로그인이 없는 사이트라 서버에 담아둘 곳이 없고, 담아둘 이유도 없다.
 *
 * 이름·가격을 함께 저장하는 것은 화면 표시용 스냅샷일 뿐이다.
 * 실제 결제 금액은 주문 시점에 서버가 상품 문서를 다시 읽어 계산한다.
 */

export type CartLineItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
};

type CartContextValue = {
  /** localStorage를 읽기 전에는 false. 하이드레이션 불일치를 피하려고 쓴다. */
  ready: boolean;
  items: CartLineItem[];
  totalCount: number;
  totalAmount: number;
  add: (item: Omit<CartLineItem, 'qty'>, qty: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = 'albam.cart.v1';

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartLineItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((i) => i && typeof i.productId === 'string' && Number(i.qty) > 0)
      .map((i) => ({
        productId: i.productId,
        name: String(i.name ?? ''),
        price: Number(i.price ?? 0),
        qty: Math.max(1, Math.floor(Number(i.qty))),
      }));
  } catch {
    return []; // 저장된 값이 깨졌으면 조용히 비운다
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // 사파리 프라이빗 모드 등에서 저장이 막혀도 주문 흐름은 계속되어야 한다
    }
  }, [items, ready]);

  const add = useCallback((item: Omit<CartLineItem, 'qty'>, qty: number) => {
    if (qty <= 0) return;
    setItems((prev) => {
      const found = prev.find((i) => i.productId === item.productId);
      if (!found) return [...prev, { ...item, qty }];
      return prev.map((i) =>
        i.productId === item.productId ? { ...i, ...item, qty: i.qty + qty } : i,
      );
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.productId !== productId)
        : prev.map((i) => (i.productId === productId ? { ...i, qty } : i)),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      ready,
      items,
      totalCount: items.reduce((n, i) => n + i.qty, 0),
      totalAmount: items.reduce((n, i) => n + i.price * i.qty, 0),
      add,
      setQty,
      remove,
      clear,
    }),
    [ready, items, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart는 CartProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
