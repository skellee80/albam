import 'server-only';

import { COL, db, toMillisOr } from './firebase-admin';
import { parseProductName } from './format';
import type { Product } from './types';

/**
 * 재고 알림은 **매진 하나뿐이다.**
 *
 * 예전에는 "기준 수량의 20% 이하" 경고도 있었지만, 그러려면 관리자가 기준 수량을
 * 따로 관리해야 했다. 실제로 필요한 판단은 "지금 팔 수 있나 없나" 하나여서
 * 기준선을 없애고 매진만 알린다.
 */
export function isSoldOut(p: Pick<Product, 'stock'>): boolean {
  return p.stock <= 0;
}

/**
 * 지워진 사진 주소 → 지금 있는 파일.
 *
 * 파일을 바꿀 때마다 저장된 상품이 옛 주소를 가리킨 채로 남는다.
 * 그대로 두면 손님 화면에 깨진 그림이 뜨므로 **읽을 때** 옮겨 준다.
 * 상품을 한 번이라도 저장하면 문서에도 새 주소가 들어가고, 그러면 이 표에서 빼도 된다.
 *
 * 두 번 갈아탔다: 임시로 그린 밤 그림(svg) → 실제 사진(jpg) → webp.
 */
const RETIRED_IMAGES: Record<string, string> = {
  '/products/daebo.svg': '/products/대보.webp',
  '/products/poredan.svg': '/products/포르단.webp',
  '/products/okgwang.svg': '/products/옥광.webp',
  '/products/대보.jpg': '/products/대보.webp',
  '/products/포르단.jpg': '/products/포르단.webp',
  '/products/옥광.jpg': '/products/옥광.webp',
  '/products/축파.jpg': '/products/축파.webp',
};

function mapProduct(id: string, data: FirebaseFirestore.DocumentData): Product {
  const now = Date.now();
  const name = data.name ?? '';
  // 예전 문서에 variety/size/weight가 없거나 이름과 어긋나 있어도 이름 기준으로 맞춘다.
  const derived = parseProductName(name);

  const imageUrl = data.imageUrl ?? '';

  return {
    id,
    name,
    variety: derived.variety,
    size: derived.size,
    weight: derived.weight,
    price: Number(data.price ?? 0),
    imageUrl: RETIRED_IMAGES[imageUrl] ?? imageUrl,
    stock: Number(data.stock ?? 0),
    hidden: Boolean(data.hidden),
    // 예전 문서에는 groupOrder 가 없다. 0 으로 보면 그룹 순서는 각 그룹의
    // 첫 sortOrder 로 정해져, 지금 보이던 차례가 그대로 유지된다.
    groupOrder: Number(data.groupOrder ?? 0),
    sortOrder: Number(data.sortOrder ?? 0),
    createdAt: toMillisOr(data.createdAt, now),
    updatedAt: toMillisOr(data.updatedAt, now),
  };
}

/**
 * 상품 정렬 기준 — **그룹 순서가 먼저, 그다음 그룹 안 순서.**
 *
 * 이 한 줄이 손님 화면의 차례를 정한다. 그룹 순서만 바꾸면 그 안의 상품이
 * 통째로 따라 움직이는 것이 이 구조의 이유다.
 */
export function compareProducts(a: Product, b: Product): number {
  return (
    a.groupOrder - b.groupOrder ||
    a.sortOrder - b.sortOrder ||
    a.name.localeCompare(b.name, 'ko')
  );
}

/**
 * 상품 목록.
 * 정렬은 메모리에서 한다 — 상품이 스무 개 남짓이라 인덱스를 늘릴 이유가 없다.
 */
export async function listProducts(options: { includeHidden?: boolean } = {}): Promise<Product[]> {
  const snap = await db.collection(COL.products).get();
  const products = snap.docs.map((d) => mapProduct(d.id, d.data()));
  const visible = options.includeHidden ? products : products.filter((p) => !p.hidden);
  return visible.sort(compareProducts);
}

export async function getProduct(id: string): Promise<Product | null> {
  const doc = await db.collection(COL.products).doc(id).get();
  return doc.exists ? mapProduct(doc.id, doc.data()!) : null;
}

/**
 * 관리자가 실제로 입력하는 값.
 *
 * 품종·크기는 이름에서 유도하므로 여기에 없다.
 * **순서도 없다** — 새 상품은 자기 그룹 맨 뒤에 붙고, 자리 옮기기는 위/아래 버튼으로 한다.
 * 숫자를 직접 적게 하면 빈 번호와 겹친 번호가 쌓인다.
 */
export type ProductInput = {
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  hidden: boolean;
};

/** 이름에서 유도한 품종·크기·무게를 함께 저장한다. 손님 화면 묶음이 이 값을 쓴다. */
function withDerivedFields(input: Partial<ProductInput>) {
  if (input.name === undefined) return { ...input };
  const name = input.name.trim();
  return { ...input, name, ...parseProductName(name) };
}

/**
 * 새 상품은 **제 그룹 맨 뒤에** 붙는다.
 *
 * 이미 있는 그룹이면 그 그룹의 순서를 물려받고, 처음 보는 그룹이면 맨 뒤 그룹이 된다.
 * 아버지가 순서를 따로 정하지 않아도 자리가 잡히고, 마음에 안 들면 ▲▼ 로 옮긴다.
 */
export async function createProduct(input: ProductInput): Promise<string> {
  const now = Date.now();
  const group = groupNameOf(input.name);

  const all = (await db.collection(COL.products).get()).docs.map((d) =>
    mapProduct(d.id, d.data()),
  );
  const siblings = all.filter((p) => groupNameOf(p.name) === group);

  const groupOrder =
    siblings.length > 0
      ? siblings[0].groupOrder
      : // 처음 보는 그룹 — 지금 있는 그룹 중 가장 뒤 다음 자리
        all.reduce((max, p) => Math.max(max, p.groupOrder), -1) + 1;

  const sortOrder = siblings.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1;

  const ref = await db.collection(COL.products).add({
    ...withDerivedFields(input),
    groupOrder,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

/* ────────────────────────────────────────────────────────────
 * 순서 옮기기
 *
 * 그룹 순서가 먼저, 그 안의 상품 순서가 그다음이다.
 * **옮길 때마다 0부터 다시 매긴다** — 빈 번호나 겹친 번호가 쌓이지 않는다.
 * ──────────────────────────────────────────────────────────── */

/** 이름 맨 앞 낱말이 그룹이다. 못 읽으면 이름 전체를 그룹으로 본다. */
function groupNameOf(name: string): string {
  return parseProductName(name).variety || name;
}

type Loaded = { product: Product; ref: FirebaseFirestore.DocumentReference };

async function loadAll(): Promise<Loaded[]> {
  const snap = await db.collection(COL.products).get();
  return snap.docs.map((d) => ({ product: mapProduct(d.id, d.data()), ref: d.ref }));
}

/** 지금 순서대로 그룹을 늘어놓는다 */
function groupsInOrder(rows: Loaded[]): { name: string; rows: Loaded[] }[] {
  const sorted = [...rows].sort((a, b) => compareProducts(a.product, b.product));
  const groups: { name: string; rows: Loaded[] }[] = [];

  for (const row of sorted) {
    const name = groupNameOf(row.product.name);
    let group = groups.find((g) => g.name === name);
    if (!group) {
      group = { name, rows: [] };
      groups.push(group);
    }
    group.rows.push(row);
  }
  return groups;
}

/**
 * 그룹 하나를 위/아래로 옮긴다. **그 그룹 상품 전체가 통째로 따라간다.**
 * @returns 실제로 옮겼으면 true. 이미 끝이면 false (오류가 아니다)
 */
export async function moveGroup(group: string, direction: 'up' | 'down'): Promise<boolean> {
  const groups = groupsInOrder(await loadAll());
  const index = groups.findIndex((g) => g.name === group);
  if (index < 0) throw new Error('그 그룹을 찾지 못했습니다.');

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= groups.length) return false;

  [groups[index], groups[target]] = [groups[target], groups[index]];

  // 옮긴 뒤 전체를 0부터 다시 매긴다
  const now = Date.now();
  const batch = db.batch();
  groups.forEach((g, groupOrder) => {
    for (const row of g.rows) {
      if (row.product.groupOrder !== groupOrder) {
        batch.update(row.ref, { groupOrder, updatedAt: now });
      }
    }
  });
  await batch.commit();
  return true;
}

/** 상품 하나를 **제 그룹 안에서** 위/아래로 옮긴다. 그룹 밖으로는 나가지 않는다. */
export async function moveProduct(productId: string, direction: 'up' | 'down'): Promise<boolean> {
  const rows = await loadAll();
  const me = rows.find((r) => r.product.id === productId);
  if (!me) throw new Error('그 상품을 찾지 못했습니다.');

  const group = groupsInOrder(rows).find((g) => g.name === groupNameOf(me.product.name));
  if (!group) throw new Error('그 상품의 그룹을 찾지 못했습니다.');

  const index = group.rows.findIndex((r) => r.product.id === productId);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= group.rows.length) return false;

  [group.rows[index], group.rows[target]] = [group.rows[target], group.rows[index]];

  const now = Date.now();
  const batch = db.batch();
  group.rows.forEach((row, sortOrder) => {
    if (row.product.sortOrder !== sortOrder) {
      batch.update(row.ref, { sortOrder, updatedAt: now });
    }
  });
  await batch.commit();
  return true;
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  await db
    .collection(COL.products)
    .doc(id)
    .update({ ...withDerivedFields(patch), updatedAt: Date.now() });
}

export async function deleteProduct(id: string): Promise<void> {
  await db.collection(COL.products).doc(id).delete();
}

/**
 * 한 그룹(품종)의 사진을 한꺼번에 바꾼다.
 *
 * 사진은 상품마다가 아니라 **그룹마다** 정한다. 같은 품종이면 사진이 어차피 같은데
 * 상품마다 따로 두면 여섯 군데를 똑같이 고쳐야 하고, 한 곳만 빠뜨리면 손님 화면에서
 * 같은 품종의 사진이 갈린다.
 *
 * 그룹은 이름 맨 앞 낱말이므로 그것으로 상품을 찾는다(variety 필드로 질의하지 않는 이유:
 * 예전 문서에는 그 필드가 없거나 이름과 어긋나 있을 수 있어, 읽을 때 이름에서 다시 뽑는다).
 *
 * @returns 바뀐 상품 수
 */
/**
 * 그룹(품종) 이름을 바꾼다.
 *
 * 그룹은 따로 저장하지 않고 상품 이름 맨 앞 낱말에서 읽으므로, 이름을 바꾸려면
 * **그 그룹 상품들의 이름을 전부 고쳐야** 한다. "대보 중 4kg" → "청실 중 4kg".
 *
 * 지난 주문에 남은 상품명은 건드리지 않는다. 그때 팔린 것은 그때 이름으로
 * 남아 있어야 아버지가 옛 주문을 보고 무엇을 보냈는지 알 수 있다.
 *
 * @returns 바뀐 상품 수
 */
export async function renameGroup(from: string, to: string): Promise<number> {
  const oldName = from.trim();
  const newName = to.trim();

  if (!oldName || !newName) throw new Error('그룹 이름을 입력해 주세요.');
  if (newName.includes(' ')) throw new Error('그룹 이름은 띄어쓰기 없이 한 낱말로 넣어 주세요.');
  if (oldName === newName) return 0;

  const snap = await db.collection(COL.products).get();

  // 바꾸려는 이름이 이미 있으면 두 그룹이 섞인다. 미리 막는다.
  const taken = snap.docs.some((doc) => {
    const name = String(doc.data().name ?? '');
    return (parseProductName(name).variety || name) === newName;
  });
  if (taken) throw new Error(`"${newName}" 그룹이 이미 있습니다.`);

  const targets = snap.docs.filter((doc) => {
    const name = String(doc.data().name ?? '');
    return (parseProductName(name).variety || name) === oldName;
  });
  if (targets.length === 0) return 0;

  const now = Date.now();
  const batch = db.batch();
  for (const doc of targets) {
    const name = String(doc.data().name ?? '');
    // 맨 앞 낱말만 갈아 끼운다. 뒤의 크기·무게는 그대로 둔다.
    const rest = name.slice(oldName.length);
    const renamed = `${newName}${rest}`;
    batch.update(doc.ref, {
      name: renamed,
      ...parseProductName(renamed),
      updatedAt: now,
    });
  }
  await batch.commit();

  return targets.length;
}

export async function setGroupImage(group: string, imageUrl: string): Promise<number> {
  const snap = await db.collection(COL.products).get();

  const targets = snap.docs.filter((doc) => {
    const name = String(doc.data().name ?? '');
    return (parseProductName(name).variety || name) === group;
  });
  if (targets.length === 0) return 0;

  const now = Date.now();
  const batch = db.batch();
  for (const doc of targets) batch.update(doc.ref, { imageUrl, updatedAt: now });
  await batch.commit();

  return targets.length;
}
