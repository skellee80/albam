import 'server-only';

import { COL, db, toMillisOr } from './firebase-admin';
import { parseProductName } from './format';
import { defaultProducts } from './seed-products';
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

function mapProduct(id: string, data: FirebaseFirestore.DocumentData): Product {
  const now = Date.now();
  const name = data.name ?? '';
  // 예전 문서에 variety/size/weight가 없거나 이름과 어긋나 있어도 이름 기준으로 맞춘다.
  const derived = parseProductName(name);

  return {
    id,
    name,
    variety: derived.variety,
    size: derived.size,
    weight: derived.weight,
    price: Number(data.price ?? 0),
    imageUrl: data.imageUrl ?? '',
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
 * 상품이 하나도 없을 때 기본 18종을 넣는다.
 *
 * 배포 직후 관리자 화면에서 한 번 누르면 되도록 만든 것이다.
 * 서버 자격증명 없이 로컬에서 운영 DB에 시드하려면 gcloud 설정이 필요한데,
 * 그걸 아버지나 사용자가 하게 만들 이유가 없다.
 *
 * **이미 상품이 있으면 아무것도 하지 않는다.** 실수로 눌러도 기존 재고·가격이
 * 덮어써지지 않아야 한다.
 */
export async function seedDefaultProductsIfEmpty(): Promise<number> {
  const existing = await db.collection(COL.products).limit(1).get();
  if (!existing.empty) return 0;

  const seeds = defaultProducts();
  const now = Date.now();
  const batch = db.batch();
  for (const product of seeds) {
    batch.set(db.collection(COL.products).doc(), { ...product, createdAt: now, updatedAt: now });
  }
  await batch.commit();

  return seeds.length;
}
