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
      {/*
        제목은 OrderForm 안에 있다. 주문을 마치면 이 화면이 "주문이 접수되었습니다"로
        통째로 바뀌는데, 제목을 여기 두면 그 위에 "주문하기"가 남아 무엇을 보고 있는지
        헷갈린다. 화면이 바뀔 때 제목도 같이 바뀌어야 한다.
      */}
      <main className="mx-auto w-full max-w-[30rem] px-4 pt-6 pb-10">
        <OrderForm products={orderProducts} settings={settings} />
      </main>
    </>
  );
}
