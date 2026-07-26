import 'server-only';

import { COL, db, toMillisOr } from './firebase-admin';
import type { Product, Size, Variety } from './types';

/** 재고가 이 비율 이하로 남으면 관리자 화면에서 경고한다. (PRD: 20%) */
export const LOW_STOCK_RATIO = 0.2;

export function isSoldOut(p: Pick<Product, 'stock'>): boolean {
  return p.stock <= 0;
}

export function isLowStock(p: Pick<Product, 'stock' | 'initialStock'>): boolean {
  if (p.stock <= 0) return false; // 소진은 별도로 더 강하게 표시한다
  if (p.initialStock <= 0) return false; // 기준선이 없으면 판단 불가
  return p.stock <= p.initialStock * LOW_STOCK_RATIO;
}

function mapProduct(id: string, data: FirebaseFirestore.DocumentData): Product {
  const now = Date.now();
  return {
    id,
    name: data.name ?? '',
    variety: data.variety as Variety,
    size: data.size as Size,
    price: Number(data.price ?? 0),
    imageUrl: data.imageUrl ?? '',
    stock: Number(data.stock ?? 0),
    initialStock: Number(data.initialStock ?? 0),
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

export type ProductInput = {
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

export async function createProduct(input: ProductInput): Promise<string> {
  const now = Date.now();
  const ref = await db.collection(COL.products).add({ ...input, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function updateProduct(id: string, patch: Partial<ProductInput>): Promise<void> {
  await db
    .collection(COL.products)
    .doc(id)
    .update({ ...patch, updatedAt: Date.now() });
}

export async function deleteProduct(id: string): Promise<void> {
  await db.collection(COL.products).doc(id).delete();
}
