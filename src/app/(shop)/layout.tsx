import { CartProvider } from '@/components/CartProvider';

/** 고객 화면(/, /order, /track)은 장바구니 상태를 공유한다. 관리자 화면은 이 레이아웃을 쓰지 않는다. */
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
