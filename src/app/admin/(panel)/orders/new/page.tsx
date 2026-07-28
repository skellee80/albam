import Link from 'next/link';

import { DirectOrderForm, type SellableProduct } from '@/components/admin/DirectOrderForm';
import { listProducts } from '@/lib/products';

export const dynamic = 'force-dynamic';

/**
 * 전화 주문·방문 판매를 손으로 넣는 화면.
 * 사이트를 거치지 않고 팔린 것도 재고에서 빼기 위해 있다.
 */
export default async function NewDirectOrderPage() {
  const products = await listProducts({ includeHidden: true });

  const sellable: SellableProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
  }));

  return (
    <div>
      <Link
        href="/admin/orders"
        className="inline-block px-1 py-1 text-[0.85rem] text-ink-soft underline underline-offset-2"
      >
        ‹ 주문관리
      </Link>

      <h1 className="mt-1 px-1 font-display text-[1.4rem]">직접 주문 넣기</h1>
      <p className="mt-1 px-1 text-[0.88rem] leading-snug text-ink-soft">
        전화로 받았거나 만나서 판 것을 넣습니다. <b>재고에서 함께 빠집니다.</b>
      </p>

      <DirectOrderForm products={sellable} />
    </div>
  );
}
