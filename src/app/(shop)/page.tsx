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
  burr: { chip: 'bg-burr text-white', label: 'text-burr-deep' },
  shell: { chip: 'bg-shell text-white', label: 'text-shell' },
  amber: { chip: 'bg-amber text-white', label: 'text-amber' },
} as const;

/**
 * 품종(그룹)으로만 묶는다.
 *
 *   대보                    ← 그룹 이름
 *     대보 중 4kg   28,000원
 *     대보 중 10kg  62,000원
 *     대보 대 4kg   35,000원
 *
 * 크기로 한 겹 더 묶지 않는다. 크기 띠에 "중"만 덩그러니 뜨는데, 사진 밑 이름을 뺀
 * 뒤로는 그 띠가 화면에서 유일한 제목 자리라 정작 품종 이름이 어디에도 안 나왔다.
 * 줄에도 무게만 적으면 "4kg"이 무엇의 4kg인지 알 수 없다. 각 줄에 상품 이름을
 * 통째로 적으면 두 문제가 한꺼번에 없어지고, 크기 뜻은 위의 "밤 사이즈" 안내가 맡는다.
 *
 * 미리 정해둔 목록을 훑지 않고 **실제 상품에 있는 값**을 순서대로 모은다.
 * 관리자가 새 이름의 상품을 넣어도 목록에서 조용히 사라지지 않는다.
 */
function groupProducts(products: Product[]) {
  const groups: { variety: string; image: string; items: Product[] }[] = [];

  for (const product of products) {
    // 이름에서 품종을 못 읽어내면 이름 전체를 그룹으로 쓴다 — 목록에서 빠지는 것보다 낫다
    const variety = product.variety || product.name;

    let group = groups.find((g) => g.variety === variety);
    if (!group) {
      group = { variety, image: product.imageUrl, items: [] };
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
        <p className="px-1 text-center font-display text-[1.15rem] leading-relaxed text-burr-deep">
          올해 딴 햇밤을 밭에서 바로 보냅니다.
        </p>

        {/*
          크기 안내는 여기서 한 번만 한다.
          중·대·특이 모든 묶음에서 똑같이 반복되므로, 상품마다 붙이면 같은 문장을
          열여덟 번 읽게 된다.

          한 크기당 한 줄만 쓴다. 예전에는 이름표와 설명을 위아래로 쌓아 세 크기가
          여섯 줄을 차지했고, 정작 팔 상품이 첫 화면에서 밀려났다.
        */}
        <section className="mt-5 overflow-hidden rounded-card border border-line bg-surface">
          <h2 className="bg-flesh/45 px-4 py-2.5 text-center font-display text-[1rem] text-shell">
            밤 사이즈
          </h2>
          <dl className="divide-y divide-line/70">
            {SIZE_GUIDE.map((guide) => (
              <div key={guide.size} className="flex items-center gap-2.5 px-4 py-2.5">
                <dt
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-bold ${SIZE_TONE[guide.tone].chip}`}
                >
                  {guide.size}
                </dt>
                {/* 이름표와 설명을 같은 색으로 두고 굵기로만 나눈다 — 한 줄이 한 등급이라는 게 보인다 */}
                <dd
                  className={`min-w-0 flex-1 text-[0.83rem] leading-snug ${SIZE_TONE[guide.tone].label}`}
                >
                  <b>{guide.tag}</b>
                  <span aria-hidden="true" className="px-1 opacity-70">
                    →
                  </span>
                  <span className="font-normal">{guide.note}</span>
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
          /*
            묶음 사이를 넉넉히 벌리고 가운데에 표시를 하나 둔다.
            사진 밑 이름을 뺐기 때문에 "여기서 다음 품종이 시작된다"를 알려줄 것이
            간격밖에 없다. 간격만으로는 스크롤 중에 이어져 보인다.
          */
          <div className="mt-7 space-y-11">
            {groups.map((group, groupIndex) => (
              <div key={group.variety}>
                {groupIndex > 0 && <GroupBreak />}

                {/*
                  품종 하나 = 카드 하나. 사진과 가격 줄이 **한 테두리 안에** 들어간다.
                  손님이 고르는 단위는 품종이므로 그 단위로 묶는다.

                  품종 이름은 글자로 쓰지 않고 사진이 대신한다. 화면 낭독기에는
                  aria-label 로 알려 주므로 눈으로 안 보여도 어느 품종인지 전해진다.
                */}
                <section className="card overflow-hidden" aria-label={group.variety}>
                  {group.image ? (
                    // 사진이 카드의 머리다. 아래 가시 선이 사진과 본문을 물어 준다.
                    // 관리자가 임의의 외부 URL을 넣을 수 있어 next/image 대신 일반 img를 쓴다.
                    <div className="burr-edge burr-edge-surface relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={group.image}
                        alt={group.variety}
                        className="block aspect-[5/3] w-full bg-flesh/40 object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    /*
                      사진이 있으면 이름 띠를 두지 않는다 — 아래 줄마다 "대보 중 4kg" 처럼
                      품종이 이미 들어 있어 같은 말이 두 번 나온다.
                      사진이 없을 때만 무엇인지 알려 줄 것이 필요하다.
                    */
                    <h2 className="bg-flesh/45 px-4 py-2.5 text-center font-display text-[1.2rem] text-shell">
                      {group.variety}
                    </h2>
                  )}

                  <div className="divide-y divide-line/70">
                    {group.items.map((p) => (
                      <ProductRow key={p.id} product={toShopProduct(p)} />
                    ))}
                  </div>
                </section>
              </div>
            ))}
          </div>
        )}

        {/*
          품종 안내와 상자 안내는 **상품 목록 뒤에** 둔다.
          앞에 두면 밤을 담으러 온 손님이 읽을거리부터 지나가야 한다.
          담을 것을 고른 뒤 "어떤 밤이지?" "어떻게 오지?" 가 생기는 순서에 맞춘다.
        */}
        <section className="mt-10" aria-label="품종 안내">
          {/* 사진 안에 제목과 설명이 다 들어 있어 옆에 글을 덧붙이지 않는다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/products/밤품종.png"
            alt="축파(일반밤) · 포르단 · 옥광 · 대보 네 품종의 특징 안내"
            className="w-full rounded-card border border-line"
            loading="lazy"
          />
        </section>

        {/*
          배경은 밤 속살색(flesh)을 옅게 깐다. 상자 사진의 종이 상자 색과 이어져
          사진과 글이 한 덩어리로 보이고, 위아래 흰 카드들 사이에서 살짝 도드라진다.
        */}
        <section
          className="mt-6 overflow-hidden rounded-card border border-shell/15 bg-flesh/40"
          aria-label="포장 안내"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/products/4kg박스.jpg"
            alt="4kg 전용 상자에 담긴 밤"
            className="w-full object-contain"
            loading="lazy"
          />
          <div className="px-4 py-3.5">
            <h2 className="font-display text-[1.05rem] text-shell">이렇게 담아 보내드립니다</h2>
            <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-soft">
              <b className="text-ink">4kg</b>은 사진의 전용 상자에 담아 보냅니다.
              <br />
              <b className="text-ink">10kg</b>은 일반 택배 상자로 보내드립니다.
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-card bg-burr-tint px-5 py-5">
          <h2 className="font-display text-[1.1rem] text-burr-deep">주문은 이렇게 진행됩니다</h2>
          <ol className="mt-3 space-y-2.5 text-[0.9rem] leading-relaxed text-ink-soft">
            <li>
              <b className="text-ink">1.</b> 밤을 담고 받는 분 정보를 남깁니다.
            </li>
            <li>
              <b className="text-ink">2.</b> 안내된 계좌로 <b className="text-ink">{PAYMENT_DEADLINE_HOURS}시간 안에</b>{' '}
              입금합니다. 입금자명을 주문할 때 적은 이름과 똑같이 해주세요.{' '}
              <b className="text-ink">기한이 지나면 주문이 자동으로 취소되니</b> 바로 입금하실 수
              있을 때 주문해 주세요.
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

/**
 * 품종과 품종 사이를 끊는 표시.
 *
 * 사진 밑 이름을 뺀 뒤로는 "여기서 다음 품종이 시작된다"를 알려줄 것이 여백뿐인데,
 * 폰에서 스크롤하면 여백만으로는 한 묶음이 이어지는 것처럼 보인다.
 * 장식이 아니라 경계를 읽게 하는 표시라 가운데에 하나만 둔다.
 */
function GroupBreak() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 pb-11">
      <span className="h-px flex-1 bg-line" />
      <span className="h-1.5 w-1.5 rotate-45 rounded-[1px] bg-burr/50" />
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

function toShopProduct(p: Product): ShopProduct {
  return {
    id: p.id,
    name: p.name,
    // 줄에는 상품 이름을 통째로 적는다. "4kg" 만 적으면 무엇의 4kg인지 알 수 없고,
    // 장바구니·주문서에 남는 이름과도 달라 손님이 맞게 담았는지 확인할 수 없다.
    label: p.name,
    price: p.price,
    stock: p.stock,
  };
}
