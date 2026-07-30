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
    sortOrder: Number(data.sortOrder ?? 0),
    createdAt: toMillisOr(data.createdAt, now),
    updatedAt: toMillisOr(data.updatedAt, now),
  };
}

/**
 * 상품 목록.
 * 정렬은 메모리에서 한다 — 상품이 9개 남짓이라 인덱스를 늘릴 이유가 없다.
 */
export async function listProducts(options: { includeHidden?: boolean } = {}): Promise<Product[]> {
  const snap = await db.collection(COL.products).get();
  const products = snap.docs.map((d) => mapProduct(d.id, d.data()));
  const visible = options.includeHidden ? products : products.filter((p) => !p.hidden);
  return visible.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ko'));
}

export async function getProduct(id: string): Promise<Product | null> {
  const doc = await db.collection(COL.products).doc(id).get();
  return doc.exists ? mapProduct(doc.id, doc.data()!) : null;
}

/** 관리자가 실제로 입력하는 값. 품종·크기는 이름에서 유도하므로 여기에 없다. */
export type ProductInput = {
  name: string;
  price: number;
  imageUrl: string;
  stock: number;
  hidden: boolean;
  sortOrder: number;
};

/** 이름에서 유도한 품종·크기·무게를 함께 저장한다. 손님 화면 묶음이 이 값을 쓴다. */
function withDerivedFields(input: Partial<ProductInput>) {
  if (input.name === undefined) return { ...input };
  const name = input.name.trim();
  return { ...input, name, ...parseProductName(name) };
}

export async function createProduct(input: ProductInput): Promise<string> {
  const now = Date.now();
  const ref = await db
    .collection(COL.products)
    .add({ ...withDerivedFields(input), createdAt: now, updatedAt: now });
  return ref.id;
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
