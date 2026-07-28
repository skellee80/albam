'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  deleteProductAction,
  restockProductAction,
  saveProductAction,
  seedProductsAction,
} from '@/app/admin/actions';
import { formatKRW, parseProductName } from '@/lib/format';
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


const EMPTY_DRAFT: Draft = {
  name: '',
  price: 0,
  imageUrl: '/products/daebo.svg',
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
function groupByVariety(products: ManagedProduct[]) {
  const groups: { name: string; items: ManagedProduct[] }[] = [];

  for (const product of products) {
    const variety = parseProductName(product.name).variety || product.name || '이름 없음';
    let group = groups.find((g) => g.name === variety);
    if (!group) {
      group = { name: variety, items: [] };
      groups.push(group);
    }
    group.items.push(product);
  }

  return groups;
}

export function ProductManager({ products }: { products: ManagedProduct[] }) {
  /** 무엇을 새로 만들고 있나. 그룹 이름이 들어 있으면 그 그룹에 넣는 중. */
  const [creating, setCreating] = useState<{ group: string } | null>(null);

  const groups = groupByVariety(products);

  return (
    <div className="mt-3 space-y-4">
      {products.length === 0 && !creating && <EmptyState />}

      {groups.map((group) => (
        <section key={group.name} className="card overflow-hidden">
          <header className="flex items-baseline justify-between gap-3 bg-flesh/45 px-4 py-2.5">
            <h2 className="font-display text-[1.15rem] text-shell">{group.name}</h2>
            <span className="tnum shrink-0 text-[0.78rem] text-ink-soft">
              {group.items.length}가지
            </span>
          </header>

          <div className="divide-y divide-line">
            {group.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {creating?.group === group.name ? (
            <div className="border-t-2 border-line px-4 py-4">
              <h3 className="mb-3 font-display text-[1.05rem]">{group.name} 에 상품 추가</h3>
              <ProductForm
                initial={{ ...EMPTY_DRAFT, name: `${group.name} ` }}
                productId={null}
                onDone={() => setCreating(null)}
                onCancel={() => setCreating(null)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating({ group: group.name })}
              className="w-full border-t border-line px-4 py-3 text-[0.88rem] font-semibold text-burr-deep"
            >
              + {group.name} 에 상품 추가
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

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={next} className="btn btn-primary flex-1">
          다음
        </button>
        <button type="button" onClick={onCancel} className="btn btn-outline px-5">
          취소
        </button>
      </div>
    </div>
  );
}

/**
 * 상품이 하나도 없을 때만 나온다.
 *
 * 배포 직후에는 Firestore가 비어 있어 손님 화면에 아무것도 안 보인다.
 * 18종을 손으로 넣게 하는 대신 버튼 하나로 채우고, 가격과 재고를 고치게 한다.
 * 넣고 나면 이 영역은 사라지므로 실수로 다시 누를 일이 없다.
 */
function EmptyState() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function seed() {
    setError(null);
    startTransition(async () => {
      const result = await seedProductsAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="card px-4 py-5 text-center">
      <p className="font-display text-[1.1rem]">아직 상품이 없습니다</p>
      <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-soft">
        품종 3가지 × 크기 3가지 × 4kg·10kg,
        <br />
        모두 <b>18가지</b>를 한 번에 넣어 드립니다.
        <br />
        가격과 재고는 넣은 뒤 바로 고칠 수 있습니다.
      </p>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-berry-tint px-3.5 py-2.5 text-[0.85rem] font-semibold text-berry"
        >
          {error}
        </p>
      )}

      <button type="button" onClick={seed} disabled={pending} className="btn btn-primary mt-4 w-full">
        {pending ? '넣는 중…' : '기본 상품 18가지 넣기'}
      </button>
      <p className="mt-2 text-[0.78rem] text-ink-soft">
        가격은 임시 값입니다. 넣은 뒤 꼭 확인해 주세요.
      </p>
    </div>
  );
}

function ProductCard({ product }: { product: ManagedProduct }) {
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
            {product.name}
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

      <div>
        <label className="label">사진</label>

        {/* 지금 무엇이 걸려 있는지 눈으로 보여준다. 주소만 보고는 알 수 없다. */}
        <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center overflow-hidden rounded-2xl border border-line bg-paper">
          {draft.imageUrl ? (
            // 관리자가 임의의 외부 URL을 넣을 수 있어 next/image 대신 일반 img를 쓴다
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.imageUrl} alt="지금 걸린 사진" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[0.7rem] text-ink-faint">사진 없음</span>
          )}
        </div>

        <input
          className="field mt-2.5"
          value={draft.imageUrl}
          onChange={(e) => set('imageUrl', e.target.value)}
          placeholder="/products/daebo.svg"
          aria-label="사진 주소"
        />
        <p className="mt-1.5 text-[0.78rem] leading-snug text-ink-soft">
          찍은 사진을 여기서 바로 올릴 수는 없습니다. 인터넷에 올라간 사진의 주소
          (<b>https://</b> 로 시작하고 <b>.jpg</b> 나 <b>.png</b> 로 끝나는 것)를 붙여넣으세요.
        </p>
      </div>

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

      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary flex-1">
          {pending ? '저장 중…' : '저장'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-outline px-5">
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
