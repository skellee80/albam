'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  deleteProductAction,
  restockProductAction,
  saveProductAction,
  setGroupImageAction,
} from '@/app/admin/actions';
import { formatKRW, parseProductName } from '@/lib/format';
import type { ProductImage as ProductImageOption } from '@/lib/product-images';
import { LOW_STOCK_NOTICE_THRESHOLD } from '@/lib/types';

export type ManagedProduct = {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  hidden: boolean;
  sortOrder: number;
};

type Draft = Omit<ManagedProduct, 'id'>;


/** 새 상품의 기본값. 사진은 그룹에서 물려받으므로 비워 둔다. */
const EMPTY_DRAFT: Draft = {
  name: '',
  price: 0,
  imageUrl: '',
  stock: 0,
  hidden: false,
  sortOrder: 99,
};

/**
 * 이름을 어떻게 나눠서 손님 화면에 보일지 미리 알려준다.
 * 품종·크기·무게를 따로 입력받지 않으므로, 이름을 바꿀 때 결과가 눈에 보여야 한다.
 */
function namePreview(name: string): string {
  const { variety, size, weight } = parseProductName(name);
  if (!variety) {
    return '"대보 중 4kg" 처럼 품종 · 크기 · 무게를 띄어 적으면 손님 화면에서 자동으로 묶입니다.';
  }
  const group = weight ? `${variety} ${weight}` : variety;
  if (!size) return `손님 화면에 "${group}" 묶음으로 하나만 나옵니다.`;
  return `손님 화면에서 "${group}" 묶음 안에 "${size}" 로 나옵니다.`;
}

/**
 * 상품을 그룹(품종)으로 묶는다.
 *
 * 그룹 이름은 따로 저장하지 않고 **상품 이름 앞부분에서 읽어낸다.**
 * "대보 중 4kg" 의 그룹은 "대보". 그룹을 별도 필드로 두면 이름과 그룹이 어긋난
 * 상품이 생기고, 그때 손님 화면과 관리자 화면이 서로 다른 말을 하게 된다.
 * 이름 하나만 고치면 그룹도 따라 움직이는 편이 틀릴 자리가 없다.
 */
type SizeGroup = { size: string; items: ManagedProduct[] };
type VarietyGroup = { name: string; image: string; sizes: SizeGroup[] };

function groupByVariety(products: ManagedProduct[]): VarietyGroup[] {
  const groups: VarietyGroup[] = [];

  for (const product of products) {
    const parsed = parseProductName(product.name);
    const variety = parsed.variety || product.name || '이름 없음';

    let group = groups.find((g) => g.name === variety);
    if (!group) {
      group = { name: variety, image: product.imageUrl, sizes: [] };
      groups.push(group);
    }
    // 그룹 사진은 하나다. 상품마다 달라져 있으면 먼저 걸린 것을 대표로 보여준다.
    if (!group.image) group.image = product.imageUrl;

    // 크기가 안 읽히는 이름("꿀밤 선물세트")은 빈 칸 묶음에 담아 크기 띠 없이 바로 보여준다
    let size = group.sizes.find((s) => s.size === parsed.size);
    if (!size) {
      size = { size: parsed.size, items: [] };
      group.sizes.push(size);
    }
    size.items.push(product);
  }

  return groups;
}

/** 줄에 쓸 짧은 이름. 크기 묶음 안에서는 무게만 남기면 "대보 중" 이 세 번 반복되지 않는다. */
function shortLabel(product: ManagedProduct, size: string): string {
  if (!size) return product.name;
  const parsed = parseProductName(product.name);
  return parsed.weight || product.name;
}

export function ProductManager({
  products,
  images,
}: {
  products: ManagedProduct[];
  images: ProductImageOption[];
}) {
  /**
   * 지금 무엇을 새로 만들고 있나.
   *  - `null`                     아무것도 안 만드는 중
   *  - `{ group: '' }`            새 품종 그룹
   *  - `{ group: '대보' }`         대보 안에 새 크기 묶음
   *  - `{ group: '대보', size: '중' }`  대보 > 중 안에 상품
   */
  const [creating, setCreating] = useState<{ group: string; size?: string } | null>(null);

  const groups = groupByVariety(products);

  return (
    <div className="mt-3 space-y-4">
      {products.length === 0 && !creating && (
        <p className="card px-5 py-10 text-center text-[0.92rem] leading-relaxed text-ink-soft">
          아직 상품이 없습니다.
          <br />
          아래 <b>새 그룹 만들기</b> 로 품종부터 만들어 주세요.
        </p>
      )}

      {groups.map((group) => (
        <section key={group.name} className="card overflow-hidden">
          <GroupHeader group={group} images={images} />

          {/*
            품종 아래 크기로 한 겹 더 묶는다.
              대보
                중        ← 크기 묶음
                  4kg
                  10kg
            크기가 안 읽히는 이름은 띠 없이 바로 줄로 나온다.
          */}
          {group.sizes.map((sizeGroup) => (
            <div key={sizeGroup.size || '_'} className="border-t-2 border-line">
              {sizeGroup.size && (
                <div className="flex items-baseline justify-between gap-3 bg-flesh/20 px-4 py-2">
                  <h3 className="font-display text-[1rem] text-shell">{sizeGroup.size}</h3>
                  <span className="tnum shrink-0 text-[0.75rem] text-ink-faint">
                    {sizeGroup.items.length}가지
                  </span>
                </div>
              )}

              <div className="divide-y divide-line">
                {sizeGroup.items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    label={shortLabel(product, sizeGroup.size)}
                  />
                ))}
              </div>

              {sizeGroup.size &&
                (creating?.group === group.name && creating.size === sizeGroup.size ? (
                  <div className="border-t border-line px-4 py-4">
                    <h4 className="mb-3 font-display text-[1rem]">
                      {group.name} {sizeGroup.size} 에 상품 추가
                    </h4>
                    <p className="mb-3 text-[0.8rem] leading-snug text-ink-soft">
                      이름 뒤에 무게를 이어 적어 주세요. 예:{' '}
                      <b>
                        {group.name} {sizeGroup.size} 10kg
                      </b>
                    </p>
                    <ProductForm
                      // 사진은 그룹 것을 그대로 물려받는다 — 상품마다 고를 일이 없다
                      initial={{
                        ...EMPTY_DRAFT,
                        name: `${group.name} ${sizeGroup.size} `,
                        imageUrl: group.image,
                      }}
                      productId={null}
                      onDone={() => setCreating(null)}
                      onCancel={() => setCreating(null)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCreating({ group: group.name, size: sizeGroup.size })}
                    className="w-full border-t border-line px-4 py-2.5 text-left text-[0.84rem] font-semibold text-burr-deep"
                  >
                    + {sizeGroup.size} 에 상품 추가
                  </button>
                ))}
            </div>
          ))}

          {creating?.group === group.name && creating.size === undefined ? (
            <NewSize
              group={group}
              onCancel={() => setCreating(null)}
              onDone={() => setCreating(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setCreating({ group: group.name })}
              className="w-full border-t-2 border-line px-4 py-3 text-[0.88rem] font-semibold text-burr-deep"
            >
              + {group.name} 에 크기 추가
            </button>
          )}
        </section>
      ))}

      {creating && creating.group === '' ? (
        <NewGroup
          existing={groups.map((g) => g.name)}
          onCancel={() => setCreating(null)}
          onDone={() => setCreating(null)}
        />
      ) : (
        !creating && (
          <button
            type="button"
            onClick={() => setCreating({ group: '' })}
            className="btn btn-outline w-full"
          >
            새 그룹 만들기
          </button>
        )
      )}
    </div>
  );
}

/**
 * 그룹 안에 크기 묶음을 새로 만든다.
 *
 * 크기도 따로 저장하지 않는다. 이름을 "대보 중 4kg" 처럼 적으면 가운데 낱말이 크기가 된다
 * (parseProductName). 그래서 여기서 하는 일은 **크기 이름을 받아 두고, 첫 상품 이름을
 * "대보 중 " 까지 채워 주는 것**뿐이다.
 */
function NewSize({
  group,
  onCancel,
  onDone,
}: {
  group: VarietyGroup;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [size, setSize] = useState('');
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const name = size.trim();
  const existing = group.sizes.map((s) => s.size).filter(Boolean);

  function next() {
    if (!name) {
      setError('크기 이름을 넣어 주세요.');
      return;
    }
    if (name.includes(' ')) {
      setError('크기 이름은 띄어쓰기 없이 한 낱말로 넣어 주세요. (예: 중)');
      return;
    }
    if (existing.includes(name)) {
      setError(`"${name}" 은(는) 이미 있습니다. 그 아래에서 상품을 추가하세요.`);
      return;
    }
    setError(null);
    setConfirmed(name);
  }

  if (confirmed) {
    return (
      <div className="border-t-2 border-line px-4 py-4">
        <h3 className="mb-1 font-display text-[1.05rem]">
          {group.name} {confirmed} — 첫 상품
        </h3>
        <p className="mb-3 text-[0.8rem] leading-snug text-ink-soft">
          이름 뒤에 무게를 이어 적어 주세요. 예:{' '}
          <b>
            {group.name} {confirmed} 4kg
          </b>
        </p>
        <ProductForm
          initial={{
            ...EMPTY_DRAFT,
            name: `${group.name} ${confirmed} `,
            imageUrl: group.image,
          }}
          productId={null}
          onDone={onDone}
          onCancel={onCancel}
        />
      </div>
    );
  }

  return (
    <div className="border-t-2 border-line px-4 py-4">
      <h3 className="font-display text-[1.05rem]">{group.name} 에 크기 추가</h3>
      <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">
        중 · 대 · 특 처럼 크기 이름을 넣어 주세요.
        {existing.length > 0 && <> 지금은 {existing.join(' · ')} 이(가) 있습니다.</>}
      </p>

      <input
        className="field mt-3"
        value={size}
        onChange={(e) => setSize(e.target.value)}
        placeholder="예: 특"
        aria-label={`${group.name} 의 새 크기 이름`}
        onKeyDown={(e) => {
          if (e.key === 'Enter') next();
        }}
      />

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-berry-tint px-3.5 py-2.5 text-[0.85rem] font-semibold text-berry"
        >
          {error}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={next} className="btn btn-primary">
          다음
        </button>
        <button type="button" onClick={onCancel} className="btn btn-outline">
          취소
        </button>
      </div>
    </div>
  );
}

/**
 * 그룹 머리 — 이름, 상품 수, 그리고 **그룹 사진**.
 *
 * 사진을 상품마다 두지 않는 이유: 같은 품종이면 사진이 어차피 같은데 상품마다 두면
 * 여섯 군데를 똑같이 고쳐야 하고, 한 곳만 빠뜨리면 손님 화면에서 사진이 갈린다.
 *
 * 주소를 타이핑하는 대신 **폴더에 있는 사진을 눌러서 고른다.** 오타 한 글자에
 * 깨진 그림이 뜨는데 아버지는 그게 왜 안 나오는지 알 방법이 없다.
 */
function GroupHeader({
  group,
  images,
}: {
  group: VarietyGroup;
  images: ProductImageOption[];
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const itemCount = group.sizes.reduce((n, s) => n + s.items.length, 0);

  function choose(url: string) {
    setError(null);
    startTransition(async () => {
      const result = await setGroupImageAction(group.name, url);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPicking(false);
      router.refresh();
    });
  }

  return (
    <header className="bg-flesh/45">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          aria-label={`${group.name} 사진 고르기`}
          className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-surface"
        >
          {group.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={group.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[0.65rem] leading-tight text-ink-faint">
              사진
              <br />
              없음
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[1.15rem] text-shell">{group.name}</h2>
          <p className="tnum text-[0.78rem] text-ink-soft">{itemCount}가지</p>
        </div>

        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          className="shrink-0 rounded-full border border-shell/25 bg-surface px-3.5 py-2 text-[0.82rem] font-semibold text-shell"
        >
          {picking ? '닫기' : '사진 바꾸기'}
        </button>
      </div>

      {picking && (
        <div className="border-t border-shell/15 px-4 pt-3 pb-4">
          <p className="text-[0.82rem] leading-snug text-ink-soft">
            고른 사진이 <b>{group.name}</b> 상품 {itemCount}가지에 모두 걸립니다.
          </p>

          {images.length === 0 ? (
            <p className="mt-2 rounded-xl bg-surface px-3.5 py-3 text-[0.83rem] text-ink-soft">
              사진 폴더를 읽지 못했습니다. 사진은 <b>public/products/</b> 폴더에 넣고 배포하면
              여기 나옵니다.
            </p>
          ) : (
            <ul className="mt-2.5 grid grid-cols-4 gap-2">
              {images.map((image) => {
                const current = image.url === group.image;
                return (
                  <li key={image.url}>
                    <button
                      type="button"
                      onClick={() => choose(image.url)}
                      disabled={pending}
                      aria-current={current ? 'true' : undefined}
                      className={`block w-full overflow-hidden rounded-xl border-2 bg-surface disabled:opacity-50 ${
                        current ? 'border-burr' : 'border-line'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.url}
                        alt={image.label}
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                      />
                      <span className="block truncate px-1 py-1 text-[0.7rem] text-ink-soft">
                        {image.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {error && (
            <p
              role="alert"
              className="mt-2 rounded-xl bg-berry-tint px-3.5 py-2.5 text-[0.85rem] font-semibold text-berry"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </header>
  );
}

/**
 * 새 그룹 만들기.
 *
 * 그룹 이름을 **먼저 묻고**, 그다음 그 그룹의 첫 상품을 받는다.
 * 예전에는 "이름 맨 앞 낱말이 그룹이 됩니다" 라고 설명만 하고 상품 이름 한 칸을
 * 내줬는데, 그러면 그룹을 만든다는 감각이 없고 앞 낱말을 잘못 띄우면 엉뚱한 그룹이 생긴다.
 *
 * 저장할 때는 결국 "그룹 + 나머지" 를 붙인 이름 하나로 들어간다.
 * 그룹을 따로 저장하지 않는 이유는 groupByVariety 주석 참고.
 */
function NewGroup({
  existing,
  onCancel,
  onDone,
}: {
  existing: string[];
  onCancel: () => void;
  onDone: () => void;
}) {
  const [group, setGroup] = useState('');
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = group.trim();

  function next() {
    if (!name) {
      setError('그룹 이름을 넣어 주세요.');
      return;
    }
    if (name.includes(' ')) {
      setError('그룹 이름은 띄어쓰기 없이 한 낱말로 넣어 주세요. (예: 대보)');
      return;
    }
    if (existing.includes(name)) {
      setError(`"${name}" 그룹은 이미 있습니다. 그 그룹 아래에서 상품을 추가하세요.`);
      return;
    }
    setError(null);
    setConfirmed(name);
  }

  if (confirmed) {
    return (
      <div className="card px-4 py-4">
        <h2 className="mb-1 font-display text-[1.1rem]">{confirmed} — 첫 상품</h2>
        <p className="mb-3 text-[0.82rem] leading-snug text-ink-soft">
          이름 뒤에 크기와 무게를 이어 적어 주세요. 예: <b>{confirmed} 중 4kg</b>
        </p>
        <ProductForm
          initial={{ ...EMPTY_DRAFT, name: `${confirmed} ` }}
          productId={null}
          onDone={onDone}
          onCancel={onCancel}
        />
      </div>
    );
  }

  return (
    <div className="card px-4 py-4">
      <h2 className="font-display text-[1.1rem]">새 그룹</h2>
      <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">
        품종 이름을 넣어 주세요. 손님 화면에서 이 이름으로 묶입니다.
      </p>

      <input
        className="field mt-3"
        value={group}
        onChange={(e) => setGroup(e.target.value)}
        placeholder="예: 청실"
        aria-label="새 그룹 이름"
        onKeyDown={(e) => {
          if (e.key === 'Enter') next();
        }}
      />

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-berry-tint px-3.5 py-2.5 text-[0.85rem] font-semibold text-berry"
        >
          {error}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={next} className="btn btn-primary">
          다음
        </button>
        <button type="button" onClick={onCancel} className="btn btn-outline">
          취소
        </button>
      </div>
    </div>
  );
}

function ProductCard({ product, label }: { product: ManagedProduct; label?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [restock, setRestock] = useState('');
  const [pending, startTransition] = useTransition();
  const soldOut = product.stock <= 0;
  // 손님 화면에서 "N개 남았습니다"가 뜨기 시작하는 지점과 같은 기준을 쓴다.
  // 관리자와 손님이 서로 다른 기준으로 "얼마 안 남음"을 보면 대화가 어긋난다.
  const lowStock = !soldOut && product.stock <= LOW_STOCK_NOTICE_THRESHOLD;

  function applyRestock() {
    const value = Number(restock.replace(/[^\d]/g, ''));
    if (!Number.isFinite(value) || value <= 0) return;
    startTransition(async () => {
      await restockProductAction(product.id, value);
      setRestock('');
      router.refresh();
    });
  }

  return (
    /*
      그룹 카드 안의 한 줄이라 스스로 카드가 되지 않는다.
      대신 왼쪽에 색 띠를 세워 매진·부족을 표시한다 — 테두리로 감싸면 카드 안에
      카드가 겹쳐 보이고, 그룹 묶음이 흐려진다.
    */
    <article
      className={`px-4 py-4 ${product.hidden ? 'opacity-60' : ''} ${
        soldOut
          ? 'border-l-4 border-l-berry'
          : lowStock
            ? 'border-l-4 border-l-amber'
            : 'border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[1.08rem] font-bold">
            {/* 크기 묶음 안에서는 무게만 — "대보 중" 이 줄마다 반복되지 않게 */}
            {label ?? product.name}
            {product.hidden && (
              <span className="ml-2 rounded-full bg-line px-2 py-0.5 text-[0.7rem] font-semibold text-ink-soft">
                숨김
              </span>
            )}
          </p>
          <p className="tnum mt-0.5 text-[0.9rem] text-ink-soft">{formatKRW(product.price)}</p>
        </div>

        {soldOut ? (
          <span className="shrink-0 rounded-full bg-berry-tint px-2.5 py-1 text-[0.76rem] font-bold text-berry">
            매진
          </span>
        ) : lowStock ? (
          <span className="tnum shrink-0 rounded-full bg-amber-tint px-2.5 py-1 text-[0.76rem] font-bold text-amber">
            {product.stock}개 남음
          </span>
        ) : (
          <span className="tnum shrink-0 rounded-full bg-burr-tint px-2.5 py-1 text-[0.76rem] font-bold text-burr-deep">
            재고 {product.stock}
          </span>
        )}
      </div>

      {/* 가장 자주 하는 일: 재고 채우기. 펼치지 않고 바로 할 수 있게 둔다. */}
      <div className="mt-3 flex gap-2">
        <input
          className="field tnum flex-1"
          value={restock}
          onChange={(e) => setRestock(e.target.value)}
          placeholder="새 재고 수량"
          inputMode="numeric"
          aria-label={`${product.name} 재고 수량`}
        />
        <button
          type="button"
          onClick={applyRestock}
          disabled={pending || !restock}
          className="btn btn-primary shrink-0 px-5"
        >
          재고 채우기
        </button>
      </div>

      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        className="mt-2.5 text-[0.85rem] text-ink-soft underline underline-offset-2"
      >
        {editing ? '닫기' : '자세히 고치기'}
      </button>

      {editing && (
        <div className="mt-3 border-t border-line pt-3.5">
          <ProductForm
            initial={product}
            productId={product.id}
            onDone={() => setEditing(false)}
            onCancel={() => setEditing(false)}
          />
        </div>
      )}
    </article>
  );
}

function ProductForm({
  initial,
  productId,
  onDone,
  onCancel,
}: {
  initial: Draft;
  productId: string | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setError(null);
    if (!draft.name.trim()) {
      setError('상품 이름을 넣어 주세요.');
      return;
    }
    startTransition(async () => {
      const result = await saveProductAction(productId, {
        ...draft,
        name: draft.name.trim(),
        price: Number(draft.price) || 0,
        stock: Number(draft.stock) || 0,
        sortOrder: Number(draft.sortOrder) || 0,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  function remove() {
    if (!productId) return;
    if (!window.confirm('이 상품을 완전히 지울까요?\n지난 주문 기록은 그대로 남습니다.')) return;
    startTransition(async () => {
      const result = await deleteProductAction(productId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">상품 이름</label>
        <input className="field" value={draft.name} onChange={(e) => set('name', e.target.value)} />
        <p className="mt-1.5 text-[0.78rem] leading-snug text-ink-soft">
          {namePreview(draft.name)}
        </p>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="label">가격</label>
          <input
            className="field tnum"
            value={draft.price}
            onChange={(e) => set('price', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
            inputMode="numeric"
          />
        </div>
        <div className="w-28">
          <label className="label">순서</label>
          <input
            className="field tnum"
            value={draft.sortOrder}
            onChange={(e) => set('sortOrder', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
            inputMode="numeric"
          />
        </div>
      </div>

      <div>
        <label className="label">현재 재고</label>
        <input
          className="field tnum"
          value={draft.stock}
          onChange={(e) => set('stock', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
          inputMode="numeric"
        />
        <p className="mt-1.5 text-[0.78rem] leading-snug text-ink-soft">
          0이 되면 손님 화면에 품절로 표시되고 첫 화면에서 알려 줍니다.
        </p>
      </div>

      {/*
        사진 칸은 여기 없다. 같은 그룹이면 사진이 어차피 같아서 **그룹 머리에서 한 번만** 고른다.
        여기 두면 상품 여섯 개를 똑같이 고쳐야 하고, 하나만 빠뜨리면 손님 화면에서 갈린다.
        (새로 만드는 상품은 그룹 사진을 그대로 물려받는다)
      */}

      <label className="flex items-center gap-3 rounded-xl bg-paper px-3.5 py-3">
        <input
          type="checkbox"
          checked={draft.hidden}
          onChange={(e) => set('hidden', e.target.checked)}
          className="h-5 w-5 accent-[#6F9A57]"
        />
        <span className="text-[0.9rem] font-semibold">상품 목록에서 숨기기</span>
      </label>

      {error && (
        <p role="alert" className="rounded-xl bg-berry-tint px-3.5 py-2.5 text-[0.85rem] font-semibold text-berry">
          {error}
        </p>
      )}

      {/* 둘 다 같은 폭. 저장만 길면 화면에서 저장이 유일한 선택지처럼 보인다. */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary">
          {pending ? '저장 중…' : '저장'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-outline">
          취소
        </button>
      </div>

      {productId && (
        <button type="button" onClick={remove} disabled={pending} className="btn btn-danger w-full min-h-11 text-[0.88rem]">
          이 상품 지우기
        </button>
      )}
    </div>
  );
}
