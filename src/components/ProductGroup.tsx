'use client';

import { useState } from 'react';

import { formatKRW } from '@/lib/format';

import { ProductRow, type ShopProduct } from './ProductRow';

export type ShopGroup = {
  variety: string;
  image: string;
  items: ShopProduct[];
};

/**
 * 품종 하나 = 카드 하나. **접었다 폈다 한다.**
 *
 * 펼친 채로 두면 품종이 늘어날수록 첫 화면이 가격표로만 채워져, 손님이
 * 무엇을 파는지 보려면 한참 밀어내려야 한다. 사진과 품종 이름만 먼저 보이고
 * 고르고 싶은 것을 눌러 여는 편이 "무엇이 있나" → "얼마인가" 순서에 맞다.
 *
 * 접힌 채로도 **몇 가지인지, 얼마부터 얼마까지인지**는 보여준다.
 * 열어보지 않으면 아무것도 모르는 서랍은 열 마음이 안 생긴다.
 */
export function ProductGroup({ group, defaultOpen }: { group: ShopGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const inStock = group.items.filter((p) => p.stock > 0);
  const prices = (inStock.length > 0 ? inStock : group.items).map((p) => p.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const soldOut = inStock.length === 0;

  const panelId = `group-${group.variety}`;

  return (
    <section className="card overflow-hidden">
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
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 bg-flesh/45 px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[1.25rem] leading-tight text-shell">
            {group.variety}
          </span>
          <span className="tnum mt-0.5 block text-[0.82rem] text-ink-soft">
            {soldOut ? (
              '지금은 준비된 물량이 없습니다'
            ) : (
              <>
                {group.items.length}가지 · {formatKRW(low)}
                {low !== high && <> ~ {formatKRW(high)}</>}
              </>
            )}
          </span>
        </span>

        {/* 무엇을 하는 자리인지 글자로도 알려준다 — 화살표만으로는 눌러야 하는지 모른다 */}
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-[0.82rem] font-semibold text-shell">
          {open ? '접기' : '골라보기'}
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <div id={panelId} className="divide-y divide-line/70 border-t border-line">
          {group.items.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
