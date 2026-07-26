import type { Metadata } from 'next';

import { OrderForm, type OrderProduct } from '@/components/OrderForm';
import { SiteHeader } from '@/components/SiteHeader';
import { expireStaleOrders } from '@/lib/orders';
import { listProducts } from '@/lib/products';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '주문하기',
  robots: { index: false, follow: false },
};

export default async function OrderPage() {
  // 기한 지난 주문을 먼저 정리해야 재고 확인이 정확하다
  await expireStaleOrders();

  // 장바구니는 브라우저에 있지만, 가격과 재고는 지금 이 순간의 서버 값으로 다시 확인한다.
  const [products, settings] = await Promise.all([
    listProducts({ includeHidden: true }),
    getSettings(),
  ]);

  const orderProducts: OrderProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    hidden: p.hidden,
  }));

  return (
    <>
      <SiteHeader active={null} />
      <main className="mx-auto w-full max-w-[30rem] px-4 pt-6 pb-10">
        <h1 className="px-1 font-display text-[1.5rem]">주문하기</h1>
        <OrderForm products={orderProducts} settings={settings} />
      </main>
    </>
  );
}
