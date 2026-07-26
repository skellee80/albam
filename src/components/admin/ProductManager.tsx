'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { deleteProductAction, restockProductAction, saveProductAction } from '@/app/admin/actions';
import { formatKRW } from '@/lib/format';
import { SIZES, VARIETIES, type Size, type Variety } from '@/lib/types';

export type ManagedProduct = {
  id: string;
  name: string;
  variety: Variety;
  size: Size;
  price: number;
  imageUrl: string;
  stock: number;
  initialStock: number;
  hidden: boolean;
  sortOrder: number;
};

type Draft = Omit<ManagedProduct, 'id'>;

const EMPTY_DRAFT: Draft = {
  name: '',
  variety: '대보',
  size: '중',
  price: 0,
  imageUrl: '/products/daebo.svg',
  stock: 0,
  initialStock: 0,
  hidden: false,
  sortOrder: 99,
};

function stockTone(product: ManagedProduct): { label: string; className: string } | null {
  if (product.stock <= 0) {
    return { label: '다 팔림', className: 'bg-berry-tint text-berry' };
  }
  if (product.initialStock > 0 && product.stock <= product.initialStock * 0.2) {
    return { label: `${product.stock}개 남음`, className: 'bg-amber-tint text-amber' };
  }
  return null;
}

export function ProductManager({ products }: { products: ManagedProduct[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="mt-3 space-y-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}

      {creating ? (
        <div className="card px-4 py-4">
          <h2 className="mb-3 font-display text-[1.1rem]">새 상품</h2>
          <ProductForm
            initial={EMPTY_DRAFT}
            productId={null}
            onDone={() => setCreating(false)}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setCreating(true)} className="btn btn-outline w-full">
          상품 추가
        </button>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: ManagedProduct }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [restock, setRestock] = useState('');
  const [pending, startTransition] = useTransition();
  const warning = stockTone(product);

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
    <article
      className={`card px-4 py-4 ${product.hidden ? 'opacity-60' : ''} ${
        warning ? 'border-2 border-amber/35' : ''
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

        {warning ? (
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.76rem] font-bold ${warning.className}`}>
            {warning.label}
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
        initialStock: Number(draft.initialStock) || 0,
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
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="label">품종</label>
          <select
            className="field"
            value={draft.variety}
            onChange={(e) => set('variety', e.target.value as Variety)}
          >
            {VARIETIES.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="label">크기</label>
          <select
            className="field"
            value={draft.size}
            onChange={(e) => set('size', e.target.value as Size)}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
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

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="label">현재 재고</label>
          <input
            className="field tnum"
            value={draft.stock}
            onChange={(e) => set('stock', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
            inputMode="numeric"
          />
        </div>
        <div className="flex-1">
          <label className="label">경고 기준</label>
          <input
            className="field tnum"
            value={draft.initialStock}
            onChange={(e) => set('initialStock', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
            inputMode="numeric"
          />
        </div>
      </div>
      <p className="text-[0.78rem] leading-snug text-ink-soft">
        경고 기준의 20% 이하로 남으면 첫 화면에서 알려 줍니다. 보통 채워 넣은 수량과 같게 둡니다.
      </p>

      <div>
        <label className="label">사진 주소</label>
        <input
          className="field"
          value={draft.imageUrl}
          onChange={(e) => set('imageUrl', e.target.value)}
          placeholder="/products/daebo.svg"
        />
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
