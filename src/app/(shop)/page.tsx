import { CartBar } from '@/components/CartBar';
import { ProductRow, type ShopProduct } from '@/components/ProductRow';
import { SiteHeader } from '@/components/SiteHeader';
import { expireStaleOrders } from '@/lib/orders';
import { listProducts } from '@/lib/products';
import { PAYMENT_DEADLINE_HOURS, SIZE_GUIDE, type Product } from '@/lib/types';

// 재고와 가격이 바로 반영되어야 하므로 캐시하지 않는다.
export const dynamic = 'force-dynamic';

/**
 * 크기 등급별 색.
 * 실속(초록) → 선물(밤색) → 최상급(주황)으로 올라가, 글을 읽기 전에도 순서가 보인다.
 */
const SIZE_TONE = {
  burr: { chip: 'bg-burr text-white', tag: 'bg-burr-tint text-burr-deep' },
  shell: { chip: 'bg-shell text-white', tag: 'bg-shell-tint text-shell' },
  amber: { chip: 'bg-amber text-white', tag: 'bg-amber-tint text-amber' },
} as const;

/**
 * 품종 → 크기 → 무게 순으로 두 겹으로 묶는다.
 *
 *   대보
 *     중    4kg / 10kg
 *     대    4kg / 10kg
 *     특    4kg / 10kg
 *
 * 무게를 바깥 묶음으로 올리면 "대보 4kg", "대보 10kg" 처럼 같은 품종이 두 번 나온다.
 * 손님은 품종을 먼저 고르고 그다음 크기와 양을 정하므로, 고르는 순서대로 겹쳐 둔다.
 *
 * 미리 정해둔 목록을 훑지 않고 **실제 상품에 있는 값**을 순서대로 모은다.
 * 관리자가 새 이름의 상품을 넣어도 목록에서 조용히 사라지지 않는다.
 */
function groupProducts(products: Product[]) {
  const groups: {
    variety: string;
    image: string;
    sizes: { size: string; items: Product[] }[];
  }[] = [];

  for (const product of products) {
    let group = groups.find((g) => g.variety === product.variety);
    if (!group) {
      group = { variety: product.variety, image: product.imageUrl, sizes: [] };
      groups.push(group);
    }
    if (!group.image) group.image = product.imageUrl;

    let sizeGroup = group.sizes.find((s) => s.size === product.size);
    if (!sizeGroup) {
      sizeGroup = { size: product.size, items: [] };
      group.sizes.push(sizeGroup);
    }
    sizeGroup.items.push(product);
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
          중·대·특이 모든 묶음에서 똑같이 반복되므로, 상품마다 붙이면 같은 문장을
          열여덟 번 읽게 된다.
        */}
        <section className="mt-5 rounded-card border border-line bg-surface px-4 py-4">
          <h2 className="font-display text-[1.05rem]">크기 고르는 법</h2>
          <dl className="mt-3 space-y-3">
            {SIZE_GUIDE.map((guide) => (
              <div key={guide.size} className="flex items-start gap-3">
                <dt
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.85rem] font-bold ${SIZE_TONE[guide.tone].chip}`}
                >
                  {guide.size}
                </dt>
                <dd className="min-w-0 pt-0.5">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[0.78rem] font-bold ${SIZE_TONE[guide.tone].tag}`}
                  >
                    {guide.tag}
                  </span>
                  <p className="mt-1 text-[0.87rem] leading-snug text-ink-soft">{guide.note}</p>
                </dd>
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
              <section key={group.variety}>
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
                  <h2 className="font-display text-[1.4rem] leading-tight">{group.variety}</h2>
                </div>

                <div className="card mt-3 divide-y-2 divide-line overflow-hidden">
                  {group.sizes.map((sizeGroup) => (
                    <div key={sizeGroup.size || '_'}>
                      {sizeGroup.size ? (
                        <p className="bg-flesh/45 px-4 py-2 text-[0.9rem] font-bold text-shell">
                          {sizeGroup.size}
                        </p>
                      ) : null}
                      <div className="divide-y divide-line/70">
                        {sizeGroup.items.map((p) => (
                          <ProductRow key={p.id} product={toShopProduct(p)} />
                        ))}
                      </div>
                    </div>
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
    // 크기는 위 소제목이 말해 주므로, 각 줄은 무게를 이름표로 쓴다.
    // 무게가 없는 이름이면 크기, 그것도 없으면 이름 전체로 물러선다.
    label: p.weight || p.size || p.name,
    price: p.price,
    stock: p.stock,
  };
}
