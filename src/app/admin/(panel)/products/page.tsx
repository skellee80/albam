import { ProductManager, type ManagedProduct } from '@/components/admin/ProductManager';
import { listProducts } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const products = await listProducts({ includeHidden: true });

  const managed: ManagedProduct[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    imageUrl: p.imageUrl,
    stock: p.stock,
    hidden: p.hidden,
    sortOrder: p.sortOrder,
  }));

  return (
    <div>
      <h1 className="px-1 font-display text-[1.4rem]">상품 · 재고</h1>
      <p className="mt-1 px-1 text-[0.88rem] leading-snug text-ink-soft">
        재고가 0이 되면 손님 화면에 <b>품절</b>로 표시되고 주문을 받지 않습니다.
      </p>

      <ProductManager products={managed} />
    </div>
  );
}
