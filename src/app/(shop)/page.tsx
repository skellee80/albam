import { CartBar } from '@/components/CartBar';
import { ProductRow, type ShopProduct } from '@/components/ProductRow';
import { SiteHeader } from '@/components/SiteHeader';
import { listProducts } from '@/lib/products';
import { VARIETIES, type Variety } from '@/lib/types';

// 재고와 가격이 바로 반영되어야 하므로 캐시하지 않는다.
export const dynamic = 'force-dynamic';

/** 품종 소개 문구 — 아버지가 관리자 화면 대신 이 파일에서 고치면 된다. */
const VARIETY_NOTE: Record<Variety, string> = {
  대보: '알이 굵어 구워 먹기 좋습니다.',
  포르단: '껍질이 잘 벗겨져 손질이 편합니다.',
  옥광: '단맛이 좋아 쪄서 그대로 먹기 좋습니다.',
};

export default async function ShopPage() {
  const products = await listProducts();

  const groups = VARIETIES.map((variety) => ({
    variety,
    image: products.find((p) => p.variety === variety)?.imageUrl ?? '',
    items: products.filter((p) => p.variety === variety),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <SiteHeader active="shop" />

      <main className="mx-auto w-full max-w-[30rem] px-4 pt-6 pb-32">
        <p className="px-1 text-[0.95rem] leading-relaxed text-ink-soft">
          올해 딴 햇밤을 밭에서 바로 보냅니다.
          <br />
          품종과 크기를 고르고 수량만 담아 주세요.
        </p>

        {groups.length === 0 ? (
          <p className="mt-10 rounded-card border border-dashed border-line px-5 py-10 text-center text-ink-soft">
            아직 등록된 상품이 없습니다.
          </p>
        ) : (
          <div className="mt-6 space-y-8">
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
                  <div>
                    <h2 className="font-display text-[1.4rem] leading-tight">{group.variety}</h2>
                    <p className="mt-0.5 text-[0.85rem] leading-snug text-ink-soft">
                      {VARIETY_NOTE[group.variety]}
                    </p>
                  </div>
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
              <b className="text-ink">2.</b> 안내된 계좌로 입금합니다. 입금자명을 주문할 때 적은
              이름과 똑같이 해주세요.
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

function toShopProduct(p: {
  id: string;
  name: string;
  size: string;
  price: number;
  stock: number;
  initialStock: number;
}): ShopProduct {
  return {
    id: p.id,
    name: p.name,
    size: p.size,
    price: p.price,
    stock: p.stock,
    initialStock: p.initialStock,
  };
}
