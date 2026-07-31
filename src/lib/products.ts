import 'server-only';

import { COL, db, toMillisOr } from './firebase-admin';
import { parseProductName } from './format';
import {
  addGroupName,
  listStoredGroupNames,
  mergeGroupNames,
  writeGroupNames,
} from './product-groups';
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
  const derived = parseProductName(name);
  const imageUrl = data.imageUrl ?? '';

  /*
    그룹(품종)은 **문서에 적힌 값을 쓴다.** 이름에서 뽑지 않는다.

    이름에서 뽑던 시절에는 "대보 소 8kg" 처럼 크기 이름이 목록(중·대·특)에 없으면
    "대보 소" 가 통째로 품종이 되어, 대보에 넣은 상품이 새 그룹으로 튀어 나갔다.

    다만 문서의 값이 이름과 아예 어긋나 있으면(옛 이름으로 저장된 채 이름만 바뀐 문서)
    이름 쪽을 믿는다 — 화면에 보이는 것은 이름이므로, 어긋날 때는 눈에 보이는 쪽이 맞다.
  */
  const stored = String(data.variety ?? '').trim();
  const variety = stored && name.startsWith(stored) ? stored : derived.variety;

  return {
    id,
    name,
    variety,
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
  /**
   * 어느 그룹에 넣을 것인가. 화면에서 "+ 대보 에 상품 추가" 로 들어오면 여기에 "대보" 가 온다.
   * 비어 있으면 이름 맨 앞 낱말로 본다(예전 방식 — 새 그룹을 만드는 길).
   */
  group?: string;
};

/**
 * 크기·무게는 이름에서 뽑아 함께 저장한다. 손님 화면의 크기 고르기가 이 값을 쓴다.
 *
 * **품종(그룹)은 여기서 건드리지 않는다.** 상품 이름을 고쳤다고 그룹이 옮겨 다니면
 * 안 된다 — 그룹은 만들 때 정해지고, 바꾸려면 그룹 이름 바꾸기로만 바뀐다.
 */
function withDerivedFields(input: Partial<ProductInput>) {
  const rest = { ...input };
  delete rest.group;
  if (rest.name === undefined) return { ...rest };
  const name = rest.name.trim();
  const { size, weight } = parseProductName(name);
  return { ...rest, name, size, weight };
}

/**
 * 새 상품은 **제 그룹 맨 뒤에** 붙는다.
 *
 * 어느 그룹인지는 `input.group` 으로 받는다 — 화면에서 "+ 대보 에 상품 추가" 를 누른
 * 그 그룹이다. 이름에서 다시 뽑지 않는다. 뽑으려 들면 "대보 소 8kg" 같은 이름이
 * 엉뚱한 그룹으로 튄다(mapProduct 주석 참고).
 *
 * **이름 앞에 그룹 이름을 붙여 준다.** 아버지가 앞부분을 지우고 "소 8kg" 만 적어도
 * "대보 소 8kg" 으로 저장된다. 그러지 않으면 주문서와 송장에 품종 없는 이름이 남는다.
 */
export async function createProduct(input: ProductInput): Promise<string> {
  const now = Date.now();
  const typed = input.name.trim();
  const group = (input.group ?? '').trim() || parseProductName(typed).variety || typed;

  const name = typed === group || typed.startsWith(`${group} `) ? typed : `${group} ${typed}`;

  const all = await listAllProducts();
  const siblings = all.filter((p) => p.variety === group);

  // 적어 둔 그룹 목록이 차례의 주인이다. 처음 보는 그룹이면 맨 뒤에 이어 붙인다.
  const stored = await listStoredGroupNames();
  const names = mergeGroupNames(
    stored,
    all.map((p) => p.variety),
  );
  if (!names.includes(group)) {
    names.push(group);
    await writeGroupNames(names);
  } else if (names.length !== stored.length) {
    await writeGroupNames(names);
  }

  const sortOrder = siblings.reduce((max, p) => Math.max(max, p.sortOrder), -1) + 1;

  const ref = await db.collection(COL.products).add({
    ...withDerivedFields({ ...input, name }),
    variety: group,
    groupOrder: names.indexOf(group),
    sortOrder,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

async function listAllProducts(): Promise<Product[]> {
  const snap = await db.collection(COL.products).get();
  return snap.docs.map((d) => mapProduct(d.id, d.data()));
}

/**
 * 지금 있는 그룹을 **차례대로** 돌려준다. 상품이 하나도 없는 그룹도 들어 있다.
 *
 * 적어 둔 목록이 주인이고, 목록에 빠진 그룹(이 구조 이전에 만들어진 상품들)은
 * 뒤에 이어 붙인다.
 */
export async function listGroupNames(): Promise<string[]> {
  const [stored, products] = await Promise.all([listStoredGroupNames(), listAllProducts()]);
  const inOrder = [...products]
    .sort(compareProducts)
    .map((p) => p.variety)
    .filter((v, i, arr) => arr.indexOf(v) === i);
  return mergeGroupNames(stored, inOrder);
}

/** 상품 없이 그룹만 먼저 만들어 둔다. */
export async function createGroup(name: string): Promise<void> {
  await addGroupName(name, await listGroupNames());
}

/**
 * 그룹을 지운다. **상품이 남아 있으면 지우지 않는다** —
 * 그룹만 사라지고 상품이 떠도는 상태가 되면 손으로 수습할 방법이 없다.
 */
export async function deleteGroup(name: string): Promise<void> {
  const group = name.trim();
  const products = await listAllProducts();
  const inGroup = products.filter((p) => p.variety === group);
  if (inGroup.length > 0) {
    throw new Error(`"${group}" 안에 상품이 ${inGroup.length}가지 있습니다. 먼저 지워 주세요.`);
  }

  const names = (await listGroupNames()).filter((n) => n !== group);
  await writeGroupNames(names);
}

/* ────────────────────────────────────────────────────────────
 * 순서 옮기기
 *
 * 그룹 순서가 먼저, 그 안의 상품 순서가 그다음이다.
 * **옮길 때마다 0부터 다시 매긴다** — 빈 번호나 겹친 번호가 쌓이지 않는다.
 * ──────────────────────────────────────────────────────────── */

type Loaded = { product: Product; ref: FirebaseFirestore.DocumentReference };

async function loadAll(): Promise<Loaded[]> {
  const snap = await db.collection(COL.products).get();
  return snap.docs.map((d) => ({ product: mapProduct(d.id, d.data()), ref: d.ref }));
}

/**
 * 적어 둔 그룹 차례대로 늘어놓고, 각 그룹에 제 상품을 담는다.
 * **상품이 없는 그룹도 빈 채로 들어 있다** — 차례를 옮길 수 있어야 하기 때문이다.
 */
function groupsInOrder(rows: Loaded[], names: string[]): { name: string; rows: Loaded[] }[] {
  const sorted = [...rows].sort((a, b) => compareProducts(a.product, b.product));
  const groups = names.map((name) => ({ name, rows: [] as Loaded[] }));

  for (const row of sorted) {
    const group = groups.find((g) => g.name === row.product.variety);
    if (group) group.rows.push(row);
  }
  return groups;
}

/** 배열에서 한 칸을 빼내 다른 자리에 끼워 넣는다 */
function moveWithin<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * 1부터 세는 자리 번호를 배열 범위 안으로 접는다.
 * 아버지가 0 이나 99 를 넣어도 맨 앞·맨 뒤로 가고 오류가 나지 않는다.
 */
function clampPosition(position: number, length: number): number {
  if (!Number.isFinite(position)) return 0;
  return Math.min(Math.max(Math.round(position) - 1, 0), length - 1);
}

/**
 * 그룹을 **몇 번째 자리로** 보낸다. 그 그룹 상품 전체가 통째로 따라간다.
 *
 * 옮긴 뒤 전체 그룹 번호를 0부터 다시 매긴다 — 빈 번호나 겹친 번호가 남지 않는다.
 * 3번 자리에 있던 그룹을 1번으로 보내면 나머지가 한 칸씩 밀린다(자리 바꾸기가 아니다).
 *
 * @param position 1부터 세는 자리 번호
 * @returns 실제로 자리가 바뀌었으면 true
 */
export async function setGroupPosition(group: string, position: number): Promise<boolean> {
  const names = await listGroupNames();
  const groups = groupsInOrder(await loadAll(), names);
  const from = groups.findIndex((g) => g.name === group);
  if (from < 0) throw new Error('그 그룹을 찾지 못했습니다.');

  const to = clampPosition(position, groups.length);
  if (from === to) return false;

  const reordered = moveWithin(groups, from, to);

  // 목록이 차례의 주인. 상품의 groupOrder 는 손님 화면이 상품만 읽고 정렬하도록 베껴 둔다.
  await writeGroupNames(reordered.map((g) => g.name));

  const now = Date.now();
  const batch = db.batch();
  reordered.forEach((g, groupOrder) => {
    for (const row of g.rows) {
      if (row.product.groupOrder !== groupOrder) {
        batch.update(row.ref, { groupOrder, updatedAt: now });
      }
    }
  });
  await batch.commit();
  return true;
}

/**
 * 상품을 **제 그룹 안에서** 몇 번째 자리로 보낸다. 그룹 밖으로는 나가지 않는다.
 *
 * @param position 그 그룹 안에서 1부터 세는 자리 번호
 */
export async function setProductPosition(productId: string, position: number): Promise<boolean> {
  const rows = await loadAll();
  const me = rows.find((r) => r.product.id === productId);
  if (!me) throw new Error('그 상품을 찾지 못했습니다.');

  const names = await listGroupNames();
  const group = groupsInOrder(rows, names).find((g) => g.name === me.product.variety);
  if (!group) throw new Error('그 상품의 그룹을 찾지 못했습니다.');

  const from = group.rows.findIndex((r) => r.product.id === productId);
  const to = clampPosition(position, group.rows.length);
  if (from === to) return false;

  const reordered = moveWithin(group.rows, from, to);

  const now = Date.now();
  const batch = db.batch();
  reordered.forEach((row, sortOrder) => {
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

  const names = await listGroupNames();
  // 바꾸려는 이름이 이미 있으면 두 그룹이 섞인다. 미리 막는다.
  if (names.includes(newName)) throw new Error(`"${newName}" 그룹이 이미 있습니다.`);
  if (!names.includes(oldName)) throw new Error('그 그룹을 찾지 못했습니다.');

  // 상품이 없는 그룹이어도 이름은 바뀌어야 한다
  await writeGroupNames(names.map((n) => (n === oldName ? newName : n)));

  const snap = await db.collection(COL.products).get();
  const targets = snap.docs.filter((doc) => mapProduct(doc.id, doc.data()).variety === oldName);
  if (targets.length === 0) return 0;

  const now = Date.now();
  const batch = db.batch();
  for (const doc of targets) {
    const name = String(doc.data().name ?? '');
    // 맨 앞의 그룹 이름만 갈아 끼운다. 뒤의 크기·무게는 그대로 둔다.
    const rest = name.startsWith(oldName) ? name.slice(oldName.length) : ` ${name}`;
    const renamed = `${newName}${rest}`;
    const { size, weight } = parseProductName(renamed);
    batch.update(doc.ref, { name: renamed, variety: newName, size, weight, updatedAt: now });
  }
  await batch.commit();

  return targets.length;
}

export async function setGroupImage(group: string, imageUrl: string): Promise<number> {
  const snap = await db.collection(COL.products).get();

  const targets = snap.docs.filter((doc) => mapProduct(doc.id, doc.data()).variety === group);
  if (targets.length === 0) return 0;

  const now = Date.now();
  const batch = db.batch();
  for (const doc of targets) batch.update(doc.ref, { imageUrl, updatedAt: now });
  await batch.commit();

  return targets.length;
}
