import { ProductManager, type ManagedProduct } from '@/components/admin/ProductManager';
import { listProductImages } from '@/lib/product-images';
import { listProducts } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  // 사진은 그룹마다 고른다. 폴더에 있는 것을 눌러서 고를 수 있게 목록을 함께 넘긴다.
  const [products, images] = await Promise.all([
    listProducts({ includeHidden: true }),
    listProductImages(),
  ]);

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
        <br />
        사진은 <b>그룹마다 한 번</b>만 고르면 그 그룹 상품 전체에 걸립니다.
      </p>

      <ProductManager products={managed} images={images} />
    </div>
  );
}
