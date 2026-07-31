'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

import {
  deleteProductAction,
  restockProductAction,
  renameGroupAction,
  saveProductAction,
  setGroupImageAction,
  setGroupPositionAction,
  setProductPositionAction,
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
  groupOrder: number;
  sortOrder: number;
};

/** 순서는 여기서 다루지 않는다 — 목록에서 끌어 옮긴다 */
type Draft = Omit<ManagedProduct, 'id' | 'groupOrder' | 'sortOrder'>;

/** 새 상품의 기본값. 사진은 그룹에서 물려받으므로 비워 둔다. */
const EMPTY_DRAFT: Draft = {
  name: '',
  price: 0,
  imageUrl: '',
  stock: 0,
  hidden: false,
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
type VarietyGroup = { name: string; image: string; items: ManagedProduct[] };

function groupByVariety(products: ManagedProduct[]): VarietyGroup[] {
  const groups: VarietyGroup[] = [];

  for (const product of products) {
    const variety = parseProductName(product.name).variety || product.name || '이름 없음';

    let group = groups.find((g) => g.name === variety);
    if (!group) {
      group = { name: variety, image: product.imageUrl, items: [] };
      groups.push(group);
    }
    // 그룹 사진은 하나다. 상품마다 달라져 있으면 먼저 걸린 것을 대표로 보여준다.
    if (!group.image) group.image = product.imageUrl;
    group.items.push(product);
  }

  return groups;
}

/** 줄에 쓸 짧은 이름. 품종은 그룹 머리에 이미 있으니 뒤만 남긴다 ("대보 중 4kg" → "중 4kg"). */
function shortLabel(product: ManagedProduct): string {
  const { variety } = parseProductName(product.name);
  if (!variety) return product.name;
  return product.name.slice(variety.length).trim() || product.name;
}

/** 배열에서 한 칸을 빼내 다른 자리에 끼워 넣는다 (서버의 setProductPosition 과 같은 규칙) */
function moveWithin<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/* ============================================================
   끌어서 순서 바꾸기
   ============================================================ */

type ItemProps = { ref: (el: HTMLElement | null) => void; style: CSSProperties };

type HandleProps = {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
  style: CSSProperties;
};

/** 끄는 중의 상태. `to` 는 지금 손을 놓으면 갈 자리다. */
type DragState = { from: number; to: number; dy: number; shift: number };

/**
 * 손가락으로 끌어 순서를 바꾸는 장치.
 *
 * 라이브러리를 쓰지 않고 포인터 이벤트로 직접 만든다. HTML5 drag & drop 은 폰에서
 * 아예 동작하지 않는데, 이 화면은 아버지가 폰으로 쓰는 화면이다.
 *
 * **끄는 동안에는 목록을 재배치하지 않는다.** CSS transform 으로 비켜서게만 하고,
 * 실제 차례는 손을 놓은 뒤에 한 번 바꾼다. 끄는 도중에 DOM 을 갈아 끼우면 손가락
 * 밑에서 줄이 튀어 무엇을 잡고 있는지 놓친다.
 *
 * 서버도 손을 놓을 때 한 번만 부른다. 한 칸 지날 때마다 저장하면 되돌리기 어려운
 * 이동이 줄줄이 남는다.
 */
function useSortable(count: number, onMove: (from: number, to: number) => void) {
  const nodes = useRef<(HTMLElement | null)[]>([]);
  /** 끌기 시작할 때 잰 줄들의 위치. 끄는 동안 다시 재지 않는다. */
  const geometry = useRef<{ tops: number[]; heights: number[] } | null>(null);
  const origin = useRef<{ from: number; y: number; pointerId: number } | null>(null);
  /*
    놓을 자리를 상태와 별도로 여기에도 적어 둔다.
    손을 놓는 순간 마지막 움직임이 아직 화면에 반영되기 전일 수 있는데,
    상태만 보면 그 마지막 한 칸을 놓친다. 이쪽은 움직인 즉시 적힌다.
  */
  const landing = useRef(0);
  const [drag, setDrag] = useState<DragState | null>(null);

  function begin(index: number, event: ReactPointerEvent<HTMLElement>) {
    if (count < 2) return;
    const els = nodes.current.slice(0, count);
    if (els.length !== count || els.some((el) => !el)) return;

    const rects = (els as HTMLElement[]).map((el) => el.getBoundingClientRect());
    const tops = rects.map((r) => r.top);
    const heights = rects.map((r) => r.height);
    // 줄 사이 틈. 그룹은 space-y-4 로 떨어져 있고, 상품 줄은 서로 붙어 있다.
    const gap = count > 1 ? tops[1] - (tops[0] + heights[0]) : 0;

    geometry.current = { tops, heights };
    origin.current = { from: index, y: event.clientY, pointerId: event.pointerId };
    landing.current = index;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ from: index, to: index, dy: 0, shift: heights[index] + gap });
  }

  function follow(event: ReactPointerEvent<HTMLElement>) {
    const start = origin.current;
    const geo = geometry.current;
    if (!start || !geo || event.pointerId !== start.pointerId) return;

    /*
      끌리는 범위를 목록 안으로 묶는다.

      두 가지를 한꺼번에 해결한다 — 그룹 카드가 overflow-hidden 이라 목록 밖으로
      나간 줄은 잘려 사라지고, 무엇보다 **상품은 제 그룹을 벗어나지 못한다**는 것이
      손끝에서 그대로 느껴진다. 위아래 끝에서 더 끌면 그냥 멈춘다.
    */
    const last = count - 1;
    const minDy = geo.tops[0] - geo.tops[start.from];
    const maxDy =
      geo.tops[last] + geo.heights[last] - (geo.tops[start.from] + geo.heights[start.from]);
    const dy = Math.min(Math.max(event.clientY - start.y, minDy), maxDy);
    const center = geo.tops[start.from] + geo.heights[start.from] / 2 + dy;

    // 잡은 줄의 한가운데가 옆 줄의 한가운데를 넘어서면 그 줄이 자리를 내준다
    let to = start.from;
    if (dy < 0) {
      for (let i = start.from - 1; i >= 0; i--) {
        if (center >= geo.tops[i] + geo.heights[i] / 2) break;
        to = i;
      }
    } else if (dy > 0) {
      for (let i = start.from + 1; i < count; i++) {
        if (center <= geo.tops[i] + geo.heights[i] / 2) break;
        to = i;
      }
    }

    landing.current = to;
    setDrag((prev) => (prev ? { ...prev, to, dy } : prev));
  }

  function end(event: ReactPointerEvent<HTMLElement>) {
    const start = origin.current;
    if (!start || event.pointerId !== start.pointerId) return;
    const to = landing.current;

    origin.current = null;
    geometry.current = null;
    setDrag(null);

    /*
      여기서 목록이 새 차례로 다시 그려진다. 손을 놓는 순간 다른 줄들은 이미
      비켜서서 자리를 비워 둔 상태라, 잡고 있던 줄이 그 빈자리에 그대로 앉는다 —
      화면상 튀는 곳이 없다.
    */
    if (to !== start.from) onMove(start.from, to);
  }

  /** 지금 이 줄이 얼마나 비켜서 있어야 하는가 */
  function offsetOf(index: number): number {
    if (!drag || index === drag.from) return 0;
    if (drag.to > drag.from && index > drag.from && index <= drag.to) return -drag.shift;
    if (drag.to < drag.from && index >= drag.to && index < drag.from) return drag.shift;
    return 0;
  }

  function itemProps(index: number): ItemProps {
    const lifted = drag?.from === index;
    const style: CSSProperties = drag
      ? {
          position: 'relative',
          zIndex: lifted ? 30 : undefined,
          transform: `translateY(${lifted ? drag.dy : offsetOf(index)}px)`,
          // 잡은 줄은 손가락을 그대로 따라간다. 나머지만 부드럽게 비킨다.
          transition: lifted ? 'none' : 'transform 180ms cubic-bezier(0.2, 0, 0, 1)',
          userSelect: 'none',
        }
      : {};

    // 잡은 줄은 종이 한 장 떠오른 것처럼 보이게 — 무엇을 쥐고 있는지 눈에 보여야 한다
    if (lifted) {
      style.boxShadow = '0 12px 26px rgb(58 49 41 / 0.2)';
      style.background = 'var(--color-surface)';
    }

    return {
      ref: (el) => {
        nodes.current[index] = el;
      },
      style,
    };
  }

  function handleProps(index: number): HandleProps {
    return {
      onPointerDown: (e) => begin(index, e),
      onPointerMove: follow,
      onPointerUp: end,
      onPointerCancel: end,
      /*
        자판으로도 옮길 수 있게 둔다. 끌기는 손이 떨리면 잘 안 잡히고,
        화면 낭독기를 쓰면 아예 잡을 수가 없다.
      */
      onKeyDown: (e) => {
        if (e.key === 'ArrowUp' && index > 0) {
          e.preventDefault();
          onMove(index, index - 1);
        }
        if (e.key === 'ArrowDown' && index < count - 1) {
          e.preventDefault();
          onMove(index, index + 1);
        }
      },
      /*
        끄는 동안 화면이 같이 스크롤되면 줄을 놓친다.
        길게 누를 때 iOS 가 띄우는 복사/선택 풍선도 막는다 — 끌기가 거기서 끊긴다.
      */
      style: {
        touchAction: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      },
    };
  }

  return { itemProps, handleProps, draggingIndex: drag?.from ?? null };
}

/**
 * 끌어 옮기는 손잡이.
 *
 * 줄 아무 데나 잡히게 두면 화면을 넘기려다 상품이 딸려 온다.
 * 잡는 자리를 따로 두면 실수로 차례가 바뀌지 않는다.
 */
function DragHandle({
  label,
  active,
  handle,
}: {
  label: string;
  active: boolean;
  handle: HandleProps;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} 차례 옮기기 — 끌어서 옮기거나 위·아래 화살표 키`}
      className={`flex h-11 w-9 shrink-0 touch-none items-center justify-center rounded-lg transition-colors select-none ${
        active ? 'bg-burr text-white' : 'text-ink-faint'
      }`}
      {...handle}
    >
      <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">
        <circle cx="4" cy="5" r="1.6" />
        <circle cx="10" cy="5" r="1.6" />
        <circle cx="4" cy="10" r="1.6" />
        <circle cx="10" cy="10" r="1.6" />
        <circle cx="4" cy="15" r="1.6" />
        <circle cx="10" cy="15" r="1.6" />
      </svg>
    </button>
  );
}

export function ProductManager({
  products,
  images,
}: {
  products: ManagedProduct[];
  images: ProductImageOption[];
}) {
  const router = useRouter();
  /**
   * 지금 무엇을 새로 만들고 있나.
   *  - `null`     아무것도 안 만드는 중
   *  - `''`       새 품종 그룹
   *  - `'대보'`    대보 안에 새 상품
   */
  const [creating, setCreating] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  /*
    끌어 놓은 차례를 화면에 **바로** 반영한다.
    서버에 저장하고 다시 받아올 때까지 기다리면, 손을 놓은 줄이 잠깐 제자리로
    돌아갔다가 뒤늦게 움직인다 — 아버지 눈에는 "안 먹었나?" 로 보인다.
    서버가 답을 주면 그쪽이 진짜다. 아래 비교문이 서버 값으로 되돌려 놓는다.
  */
  const [items, setItems] = useState(products);
  const [fromServer, setFromServer] = useState(products);
  if (fromServer !== products) {
    setFromServer(products);
    setItems(products);
  }

  const groups = groupByVariety(items);

  function reorderGroups(from: number, to: number) {
    const blocks = groups.map((g) => g.items);
    setItems(moveWithin(blocks, from, to).flat());
    startTransition(async () => {
      await setGroupPositionAction(groups[from].name, to + 1);
      router.refresh();
    });
  }

  function reorderProducts(groupIndex: number, from: number, to: number) {
    const blocks = groups.map((g) => g.items);
    const mine = blocks[groupIndex];
    blocks[groupIndex] = moveWithin(mine, from, to);
    setItems(blocks.flat());
    startTransition(async () => {
      await setProductPositionAction(mine[from].id, to + 1);
      router.refresh();
    });
  }

  const groupSort = useSortable(groups.length, reorderGroups);

  return (
    <div className="mt-3 space-y-4">
      {products.length === 0 && creating === null && (
        <p className="card px-5 py-10 text-center text-[0.92rem] leading-relaxed text-ink-soft">
          아직 상품이 없습니다.
          <br />
          아래 <b>새 그룹 만들기</b> 로 품종부터 만들어 주세요.
        </p>
      )}

      {products.length > 1 && (
        <p className="px-1 text-[0.83rem] leading-snug text-ink-soft">
          왼쪽 <b>손잡이</b>를 눌러 위아래로 끌면 차례가 바뀝니다. 그룹을 옮기면 그 안 상품이 통째로
          따라갑니다. 상품은 <b>제 그룹 안에서만</b> 움직입니다.
        </p>
      )}

      {groups.map((group, groupIndex) => (
        <section
          key={group.name}
          {...groupSort.itemProps(groupIndex)}
          className="card overflow-hidden"
        >
          <GroupHeader
            group={group}
            images={images}
            handle={groupSort.handleProps(groupIndex)}
            dragging={groupSort.draggingIndex === groupIndex}
          />

          {/*
            묶음은 품종 한 겹뿐이다. 예전에는 그 아래 크기로 한 겹 더 묶었는데,
            그러면 상품을 옮길 때 크기 띠를 넘나드는 것이 되어 지금 어디로 가는지가
            눈에 안 보였다. 한 겹으로 펴 두면 끄는 대로 보인다.
          */}
          <GroupProducts
            group={group}
            onReorder={(from, to) => reorderProducts(groupIndex, from, to)}
          />

          {creating === group.name ? (
            <div className="border-t-2 border-line px-4 py-4">
              <h3 className="mb-1 font-display text-[1.05rem]">{group.name} 에 상품 추가</h3>
              <p className="mb-3 text-[0.8rem] leading-snug text-ink-soft">
                이름 뒤에 크기와 무게를 이어 적어 주세요. 예: <b>{group.name} 중 4kg</b>
              </p>
              <ProductForm
                // 사진은 그룹 것을 그대로 물려받는다 — 상품마다 고를 일이 없다
                initial={{ ...EMPTY_DRAFT, name: `${group.name} `, imageUrl: group.image }}
                productId={null}
                onDone={() => setCreating(null)}
                onCancel={() => setCreating(null)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(group.name)}
              className="w-full border-t-2 border-line px-4 py-3 text-[0.88rem] font-semibold text-burr-deep"
            >
              + {group.name} 에 상품 추가
            </button>
          )}
        </section>
      ))}

      {creating === '' ? (
        <NewGroup
          existing={groups.map((g) => g.name)}
          onCancel={() => setCreating(null)}
          onDone={() => setCreating(null)}
        />
      ) : (
        creating === null && (
          <button type="button" onClick={() => setCreating('')} className="btn btn-outline w-full">
            새 그룹 만들기
          </button>
        )
      )}
    </div>
  );
}

/** 한 그룹의 상품 줄들. 끌어 옮기는 범위가 이 그룹 안으로 닫혀 있다. */
function GroupProducts({
  group,
  onReorder,
}: {
  group: VarietyGroup;
  onReorder: (from: number, to: number) => void;
}) {
  const sort = useSortable(group.items.length, onReorder);

  return (
    <div className="divide-y divide-line border-t-2 border-line">
      {group.items.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          label={shortLabel(product)}
          item={sort.itemProps(index)}
          handle={sort.handleProps(index)}
          dragging={sort.draggingIndex === index}
        />
      ))}
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
  handle,
  dragging,
}: {
  group: VarietyGroup;
  images: ProductImageOption[];
  handle: HandleProps;
  dragging: boolean;
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  /** 이름을 고치는 중인가. 문자열이 들어 있으면 그게 지금 입력된 새 이름. */
  const [renaming, setRenaming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const itemCount = group.items.length;

  function rename() {
    const next = (renaming ?? '').trim();
    if (!next || next === group.name) {
      setRenaming(null);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await renameGroupAction(group.name, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRenaming(null);
      router.refresh();
    });
  }

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
      <div className="flex items-center gap-2 px-3 py-3">
        {/* 이 그룹을 통째로 옮긴다 — 안의 상품이 따라간다 */}
        <DragHandle label={`${group.name} 그룹`} active={dragging} handle={handle} />

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
      </div>

      <div className="flex justify-end gap-1.5 px-4 pb-3">
        <button
          type="button"
          onClick={() => {
            setError(null);
            setRenaming(renaming === null ? group.name : null);
          }}
          className="rounded-full border border-shell/25 bg-surface px-3 py-2 text-[0.82rem] font-semibold text-shell"
        >
          {renaming === null ? '이름' : '닫기'}
        </button>
        <button
          type="button"
          onClick={() => setPicking((v) => !v)}
          className="rounded-full border border-shell/25 bg-surface px-3 py-2 text-[0.82rem] font-semibold text-shell"
        >
          {picking ? '닫기' : '사진'}
        </button>
      </div>

      {/*
        이름을 바꾸면 이 그룹 상품들의 이름 앞부분이 전부 갈아 끼워진다
        ("대보 중 4kg" → "청실 중 4kg"). 그룹을 따로 저장하지 않기 때문이다.
      */}
      {renaming !== null && (
        <div className="border-t border-shell/15 px-4 pt-3 pb-4">
          <p className="text-[0.82rem] leading-snug text-ink-soft">
            이 그룹 상품 <b>{itemCount}가지</b>의 이름이 함께 바뀝니다. 지난 주문에 남은 이름은
            그대로 둡니다.
          </p>
          <div className="mt-2.5 flex gap-2">
            <input
              className="field flex-1"
              value={renaming}
              onChange={(e) => setRenaming(e.target.value)}
              placeholder="예: 청실"
              aria-label={`${group.name} 그룹의 새 이름`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') rename();
              }}
            />
            <button
              type="button"
              onClick={rename}
              disabled={pending}
              className="btn btn-primary shrink-0 px-5"
            >
              {pending ? '바꾸는 중…' : '바꾸기'}
            </button>
          </div>
        </div>
      )}

      {picking && (
        <div className="border-t border-shell/15 px-4 pt-3 pb-4">
          <p className="text-[0.82rem] leading-snug text-ink-soft">
            고른 사진이 <b>{group.name}</b> 상품 {itemCount}가지에 모두 걸립니다.
          </p>

          {images.length === 0 ? (
            <p className="mt-2 rounded-xl bg-surface px-3.5 py-3 text-[0.83rem] text-ink-soft">
              사진 폴더를 읽지 못했습니다. 사진은 <b>public/products/</b> 폴더에 넣고 배포하면 여기
              나옵니다.
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

function ProductCard({
  product,
  label,
  item,
  handle,
  dragging,
}: {
  product: ManagedProduct;
  label?: string;
  item: ItemProps;
  handle: HandleProps;
  dragging: boolean;
}) {
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
      {...item}
      className={`px-3 py-4 ${product.hidden ? 'opacity-60' : ''} ${
        soldOut
          ? 'border-l-4 border-l-berry'
          : lowStock
            ? 'border-l-4 border-l-amber'
            : 'border-l-4 border-l-transparent'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* 제 그룹 안에서만 움직인다 */}
        <DragHandle label={product.name} active={dragging} handle={handle} />

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[1.08rem] font-bold">
            {/* 품종은 그룹 머리에 이미 있으니 뒤만 — "대보" 가 줄마다 반복되지 않게 */}
            {label ?? product.name}
            {product.hidden && (
              <span className="rounded-full bg-line px-2 py-0.5 text-[0.7rem] font-semibold text-ink-soft">
                숨김
              </span>
            )}
          </p>
          <p className="tnum mt-0.5 text-[0.9rem] text-ink-soft">{formatKRW(product.price)}</p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-end">
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

      {/*
        순서 칸은 없다. 새 상품은 제 그룹 맨 뒤에 붙고, 자리는 목록의 ▲▼ 로 옮긴다.
        숫자를 직접 적게 하면 빈 번호와 겹친 번호가 쌓이고, 아버지가 몇 번을 몇 번으로
        바꿔야 하는지 머리로 계산해야 한다.
      */}
      <div>
        <label className="label">가격</label>
        <input
          className="field tnum"
          value={draft.price}
          onChange={(e) => set('price', Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
          inputMode="numeric"
        />
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
        <p
          role="alert"
          className="rounded-xl bg-berry-tint px-3.5 py-2.5 text-[0.85rem] font-semibold text-berry"
        >
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
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="btn btn-danger w-full min-h-11 text-[0.88rem]"
        >
          이 상품 지우기
        </button>
      )}
    </div>
  );
}
