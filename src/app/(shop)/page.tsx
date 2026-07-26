import { CartBar } from '@/components/CartBar';
import { ProductRow, type ShopProduct } from '@/components/ProductRow';
import { SiteHeader } from '@/components/SiteHeader';
import { varietyGroupLabel } from '@/lib/format';
import { expireStaleOrders } from '@/lib/orders';
import { listProducts } from '@/lib/products';
import { PAYMENT_DEADLINE_HOURS, SIZE_GUIDE, type Product } from '@/lib/types';

// 재고와 가격이 바로 반영되어야 하므로 캐시하지 않는다.
export const dynamic = 'force-dynamic';

/**
 * 상품을 품종 + 무게로 묶는다 ("대보 4kg", "대보 10kg").
 *
 * 미리 정해둔 목록을 훑지 않고 **실제 상품에 있는 값**을 순서대로 모은다.
 * 관리자가 새 이름의 상품을 넣어도 목록에서 조용히 사라지지 않는다.
 */
function groupProducts(products: Product[]) {
  const groups: { key: string; label: string; image: string; items: Product[] }[] = [];

  for (const product of products) {
    const key = `${product.variety}|${product.weight}`;
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = {
        key,
        label: varietyGroupLabel(product.variety, product.weight),
        image: product.imageUrl,
        items: [],
      };
      groups.push(group);
    }
    if (!group.image) group.image = product.imageUrl;
    group.items.push(product);
  }

  return groups;
}

export default async function ShopPage() {
  // 기한 지난 입금대기 주문을 먼저 정리한다.
  // 손님이 목록을 보는 이 순간이 "재고가 정확해야 하는" 순간이라 여기서 돌린다.
  // (스로틀이 걸려 있어 실제 조회는 인스턴스당 1분에 한 번을 넘지 않는다)
  await expireStaleOrders();

  const products = await listProducts();
  const groups = groupProducts(products);

  return (
    <>
      <SiteHeader active="shop" />

      <main className="mx-auto w-full max-w-[30rem] px-4 pt-6 pb-32">
        <p className="px-1 text-[0.95rem] leading-relaxed text-ink-soft">
          올해 딴 햇밤을 밭에서 바로 보냅니다.
          <br />
          품종과 크기를 고르고 수량만 담아 주세요.
        </p>

        {/*
          크기 안내는 여기서 한 번만 한다.
          중·대·특대가 모든 묶음에서 똑같이 반복되므로, 상품마다 붙이면 같은 문장을
          열여덟 번 읽게 된다.
        */}
        <section className="mt-5 rounded-card bg-burr-tint px-4 py-4">
          <h2 className="font-display text-[1.05rem] text-burr-deep">크기 고르는 법</h2>
          <dl className="mt-2.5 space-y-2">
            {SIZE_GUIDE.map((guide) => (
              <div key={guide.size} className="flex gap-3">
                <dt className="w-9 shrink-0 text-[0.9rem] font-bold text-burr-deep">
                  {guide.size}
                </dt>
                <dd className="text-[0.87rem] leading-snug text-ink-soft">{guide.note}</dd>
              </div>
            ))}
          </dl>
        </section>

        {groups.length === 0 ? (
          <p className="mt-10 rounded-card border border-dashed border-line px-5 py-10 text-center text-ink-soft">
            아직 등록된 상품이 없습니다.
          </p>
        ) : (
          <div className="mt-7 space-y-8">
            {groups.map((group) => (
              <section key={group.key}>
                <div className="flex items-center gap-3.5 px-1">
                  {group.image ? (
                    // 관리자가 임의의 외부 URL을 넣을 수 있어 next/image 대신 일반 img를 쓴다.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={group.image}
                      alt=""
                      className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl border border-line object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <h2 className="font-display text-[1.4rem] leading-tight">{group.label}</h2>
                </div>

                <div className="card mt-3 divide-y divide-line overflow-hidden">
                  {group.items.map((p) => (
                    <ProductRow key={p.id} product={toShopProduct(p)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <section className="mt-10 rounded-card bg-burr-tint px-5 py-5">
          <h2 className="font-display text-[1.1rem] text-burr-deep">주문은 이렇게 진행됩니다</h2>
          <ol className="mt-3 space-y-2.5 text-[0.9rem] leading-relaxed text-ink-soft">
            <li>
              <b className="text-ink">1.</b> 밤을 담고 받는 분 정보를 남깁니다.
            </li>
            <li>
              <b className="text-ink">2.</b> 안내된 계좌로 <b className="text-ink">{PAYMENT_DEADLINE_HOURS}시간 안에</b>{' '}
              입금합니다. 입금자명을 주문할 때 적은 이름과 똑같이 해주세요. 기한이 지나면 주문이
              자동으로 취소됩니다.
            </li>
            <li>
              <b className="text-ink">3.</b> 입금이 확인되면 발송 준비에 들어갑니다.
            </li>
          </ol>
        </section>
      </main>

      <CartBar />
    </>
  );
}

function toShopProduct(p: Product): ShopProduct {
  return {
    id: p.id,
    name: p.name,
    // 이름이 "대보 중 4kg" 꼴이 아니면 크기가 비어 있다. 그때는 이름을 그대로 줄 이름표로 쓴다.
    label: p.size || p.name,
    price: p.price,
    stock: p.stock,
  };
}
