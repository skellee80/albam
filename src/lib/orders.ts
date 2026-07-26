import 'server-only';

import { COL, db, toMillis, toMillisOr } from './firebase-admin';
import { kstDateKey, normalizeName, normalizePhone } from './format';
import {
  PAYMENT_DEADLINE_HOURS,
  PAYMENT_DEADLINE_MS,
  STOCK_RELEASING_STATUSES,
  type CartLine,
  type Order,
  type OrderItem,
  type OrderStatus,
  type Recipient,
} from './types';

const ORDER_NO_COUNTER = 'orderNo';

/* ────────────────────────────────────────────────────────────
 * 매핑
 * ──────────────────────────────────────────────────────────── */

function mapOrder(id: string, data: FirebaseFirestore.DocumentData): Order {
  const now = Date.now();
  const items: OrderItem[] = Array.isArray(data.items)
    ? data.items.map((i: FirebaseFirestore.DocumentData) => ({
        productId: i.productId ?? '',
        name: i.name ?? '',
        price: Number(i.price ?? 0),
        qty: Number(i.qty ?? 0),
        subtotal: Number(i.subtotal ?? Number(i.price ?? 0) * Number(i.qty ?? 0)),
      }))
    : [];

  return {
    id,
    orderNo: data.orderNo ?? id,
    recipient: {
      name: data.recipient?.name ?? '',
      phone: data.recipient?.phone ?? '',
      address: data.recipient?.address ?? '',
    },
    phoneNorm: data.phoneNorm ?? '',
    depositorName: data.depositorName ?? '',
    depositorNameNorm: data.depositorNameNorm ?? '',
    depositorPhone: data.depositorPhone ?? '',
    depositorPhoneNorm: data.depositorPhoneNorm ?? '',
    sameAsDepositor: Boolean(data.sameAsDepositor),
    items,
    totalAmount: Number(data.totalAmount ?? 0),
    status: (data.status ?? '입금대기') as OrderStatus,
    trackingNo: data.trackingNo ?? '',
    memo: data.memo ?? '',
    refundAmount: Number(data.refundAmount ?? 0),
    deleted: Boolean(data.deleted),
    createdAt: toMillisOr(data.createdAt, now),
    updatedAt: toMillisOr(data.updatedAt, now),
    paidAt: toMillis(data.paidAt),
    shippedAt: toMillis(data.shippedAt),
  };
}

export function recalcTotal(items: { price: number; qty: number }[]): number {
  return items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

/**
 * 이 주문이 "지금 잡고 있어야 할" 재고.
 *
 * 재고 복원 여부를 별도 플래그로 기억하지 않고 상태에서 매번 유도한다.
 * 변경 전/후의 이 값을 비교해 차이만 재고에 반영하므로,
 * 관리자가 상태를 몇 번을 바꿔도 이중 복원이나 이중 차감이 생기지 않는다.
 */
function reservationOf(order: Pick<Order, 'deleted' | 'status' | 'items'>): Map<string, number> {
  const reserved = new Map<string, number>();
  if (order.deleted || STOCK_RELEASING_STATUSES.includes(order.status)) return reserved;
  for (const item of order.items) {
    reserved.set(item.productId, (reserved.get(item.productId) ?? 0) + item.qty);
  }
  return reserved;
}

/* ────────────────────────────────────────────────────────────
 * 주문 생성 (고객)
 * ──────────────────────────────────────────────────────────── */

export type CreateOrderInput = {
  lines: CartLine[];
  depositorName: string;
  depositorPhone: string;
  sameAsDepositor: boolean;
  recipient: Recipient;
};

export type CreateOrderResult =
  | {
      ok: true;
      orderId: string;
      orderNo: string;
      totalAmount: number;
      items: OrderItem[];
      /** 이 시각까지 입금해야 한다. 지나면 자동 취소된다. */
      paymentDueAt: number;
    }
  | { ok: false; error: string };

/**
 * 주문 생성.
 *
 * 클라이언트가 보낸 가격은 전부 버리고 상품 문서의 가격으로 다시 계산한다.
 * 브라우저에서 금액을 조작해도 서버가 저장하는 총액은 바뀌지 않는다.
 * 재고 확인·차감·주문번호 채번을 한 트랜잭션 안에서 처리해 초과 판매를 막는다.
 */
export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const depositorName = input.depositorName.trim();
  const depositorPhone = input.depositorPhone.trim();
  const recipient: Recipient = {
    name: input.recipient.name.trim(),
    phone: input.recipient.phone.trim(),
    address: input.recipient.address.trim(),
  };

  if (!depositorName) return { ok: false, error: '입금자명을 입력해 주세요.' };
  if (normalizePhone(depositorPhone).length < 9)
    return { ok: false, error: '입금하시는 분 연락처를 정확히 입력해 주세요.' };
  if (!recipient.name) return { ok: false, error: '받는 분 이름을 입력해 주세요.' };
  if (normalizePhone(recipient.phone).length < 9)
    return { ok: false, error: '받는 분 연락처를 정확히 입력해 주세요.' };
  if (!recipient.address) return { ok: false, error: '받는 분 주소를 입력해 주세요.' };

  // 같은 상품이 여러 줄로 들어와도 한 줄로 합친다 (트랜잭션에서 같은 문서를 두 번 읽지 않도록)
  const merged = new Map<string, number>();
  for (const line of input.lines) {
    const qty = Math.floor(Number(line.qty));
    if (!line.productId || !Number.isFinite(qty) || qty <= 0) continue;
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + qty);
  }
  if (merged.size === 0) return { ok: false, error: '주문할 상품이 없습니다.' };

  const entries = [...merged.entries()];

  return db.runTransaction<CreateOrderResult>(async (t) => {
    // ── 읽기 (트랜잭션은 모든 읽기를 쓰기보다 먼저 해야 한다) ──
    const productRefs = entries.map(([productId]) => db.collection(COL.products).doc(productId));
    const productSnaps = await t.getAll(...productRefs);
    const counterRef = db.collection(COL.counters).doc(ORDER_NO_COUNTER);
    const counterSnap = await t.get(counterRef);

    // ── 검증 및 계산 (쓰기 전에 전부 끝낸다) ──
    const items: OrderItem[] = [];
    const stockWrites: { ref: FirebaseFirestore.DocumentReference; stock: number }[] = [];

    for (let i = 0; i < entries.length; i++) {
      const [productId, qty] = entries[i];
      const snap = productSnaps[i];
      if (!snap.exists) return { ok: false, error: '판매하지 않는 상품이 포함되어 있습니다.' };

      const data = snap.data()!;
      if (data.hidden) return { ok: false, error: `${data.name}은(는) 현재 판매하지 않습니다.` };

      const stock = Number(data.stock ?? 0);
      if (stock <= 0) return { ok: false, error: `${data.name}이(가) 품절되었습니다.` };
      if (stock < qty)
        return { ok: false, error: `${data.name}의 재고가 ${stock}개 남았습니다.` };

      const price = Number(data.price ?? 0); // ← 서버 가격만 사용
      items.push({
        productId,
        name: data.name ?? '',
        price,
        qty,
        subtotal: price * qty,
      });
      stockWrites.push({ ref: productRefs[i], stock: stock - qty });
    }

    const totalAmount = recalcTotal(items);

    // 주문번호: KST 날짜별로 1부터. 아버지가 전화로 불러줄 수 있는 형태.
    const dateKey = kstDateKey();
    const counter = counterSnap.exists ? counterSnap.data()! : {};
    const seq = counter.dateKey === dateKey ? Number(counter.seq ?? 0) + 1 : 1;
    const orderNo = `${dateKey}-${String(seq).padStart(4, '0')}`;

    // ── 쓰기 ──
    const now = Date.now();
    for (const w of stockWrites) t.update(w.ref, { stock: w.stock, updatedAt: now });
    t.set(counterRef, { dateKey, seq });

    const orderRef = db.collection(COL.orders).doc();
    t.set(orderRef, {
      orderNo,
      recipient,
      phoneNorm: normalizePhone(recipient.phone),
      depositorName,
      depositorNameNorm: normalizeName(depositorName),
      depositorPhone,
      depositorPhoneNorm: normalizePhone(depositorPhone),
      sameAsDepositor: Boolean(input.sameAsDepositor),
      items,
      totalAmount,
      status: '입금대기' satisfies OrderStatus,
      trackingNo: '',
      memo: '',
      refundAmount: 0,
      deleted: false,
      createdAt: now,
      updatedAt: now,
      paidAt: null,
      shippedAt: null,
    });

    return {
      ok: true,
      orderId: orderRef.id,
      orderNo,
      totalAmount,
      items,
      paymentDueAt: now + PAYMENT_DEADLINE_MS,
    };
  });
}

/* ────────────────────────────────────────────────────────────
 * 주문 수정 (관리자) — 재고 동기화를 한 곳으로 모은다
 * ──────────────────────────────────────────────────────────── */

export type OrderPatch = Partial<
  Pick<
    Order,
    | 'recipient'
    | 'depositorName'
    | 'depositorPhone'
    | 'items'
    | 'status'
    | 'trackingNo'
    | 'memo'
    | 'refundAmount'
    | 'deleted'
  >
>;

/**
 * 주문을 고치고 재고를 맞춘다.
 *
 * 상태 변경이든 수량 변경이든 취소든, 변경 전후의 "잡고 있어야 할 재고"를 비교해
 * 차이만 적용하는 한 가지 경로로 처리한다. 경로가 하나뿐이라 빠뜨릴 곳이 없다.
 */
export async function updateOrder(orderId: string, patch: OrderPatch): Promise<void> {
  await db.runTransaction(async (t) => {
    const orderRef = db.collection(COL.orders).doc(orderId);
    const orderSnap = await t.get(orderRef);
    if (!orderSnap.exists) throw new Error('주문을 찾을 수 없습니다.');

    const before = mapOrder(orderSnap.id, orderSnap.data()!);
    const after: Order = { ...before, ...patch };

    // 파생 필드는 항상 다시 계산한다 (관리자가 상품/수량/가격을 고쳤을 수 있음)
    if (patch.items) after.totalAmount = recalcTotal(patch.items);
    if (patch.recipient) after.phoneNorm = normalizePhone(patch.recipient.phone);
    if (patch.depositorName !== undefined) {
      after.depositorName = patch.depositorName.trim();
      after.depositorNameNorm = normalizeName(after.depositorName);
    }
    if (patch.depositorPhone !== undefined) {
      after.depositorPhone = patch.depositorPhone.trim();
      after.depositorPhoneNorm = normalizePhone(after.depositorPhone);
    }

    const now = Date.now();
    if (patch.status && patch.status !== before.status) {
      if (patch.status === '발송대기' && !after.paidAt) after.paidAt = now;
      if (patch.status === '발송완료' && !after.shippedAt) after.shippedAt = now;
    }

    // ── 재고 차이 계산 ──
    const reservedBefore = reservationOf(before);
    const reservedAfter = reservationOf(after);
    const productIds = new Set([...reservedBefore.keys(), ...reservedAfter.keys()]);

    const stockWrites: { ref: FirebaseFirestore.DocumentReference; stock: number }[] = [];
    if (productIds.size > 0) {
      const refs = [...productIds].map((id) => db.collection(COL.products).doc(id));
      const snaps = await t.getAll(...refs);
      snaps.forEach((snap, i) => {
        if (!snap.exists) return; // 삭제된 상품은 건너뛴다
        const id = refs[i].id;
        const delta = (reservedBefore.get(id) ?? 0) - (reservedAfter.get(id) ?? 0);
        if (delta === 0) return;
        const current = Number(snap.data()!.stock ?? 0);
        stockWrites.push({ ref: refs[i], stock: Math.max(0, current + delta) });
      });
    }

    // ── 쓰기 ──
    for (const w of stockWrites) t.update(w.ref, { stock: w.stock, updatedAt: now });
    t.update(orderRef, {
      recipient: after.recipient,
      phoneNorm: after.phoneNorm,
      depositorName: after.depositorName,
      depositorNameNorm: after.depositorNameNorm,
      depositorPhone: after.depositorPhone,
      depositorPhoneNorm: after.depositorPhoneNorm,
      items: after.items,
      totalAmount: after.totalAmount,
      status: after.status,
      trackingNo: after.trackingNo,
      memo: after.memo,
      refundAmount: after.refundAmount,
      deleted: after.deleted,
      paidAt: after.paidAt,
      shippedAt: after.shippedAt,
      updatedAt: now,
    });
  });
}

export async function markShipped(orderId: string, trackingNo: string): Promise<void> {
  await updateOrder(orderId, { status: '발송완료', trackingNo: trackingNo.trim() });
}

/** 삭제는 소프트 삭제. 기록은 남기고 고객 조회에서만 감춘다. */
export async function softDeleteOrder(orderId: string): Promise<void> {
  await updateOrder(orderId, { deleted: true });
}

export async function restoreOrder(orderId: string): Promise<void> {
  await updateOrder(orderId, { deleted: false });
}

/* ────────────────────────────────────────────────────────────
 * 조회
 * ──────────────────────────────────────────────────────────── */

export async function getOrder(orderId: string): Promise<Order | null> {
  const doc = await db.collection(COL.orders).doc(orderId).get();
  return doc.exists ? mapOrder(doc.id, doc.data()!) : null;
}

export async function getOrders(orderIds: string[]): Promise<Order[]> {
  if (orderIds.length === 0) return [];
  const refs = orderIds.map((id) => db.collection(COL.orders).doc(id));
  const snaps = await db.getAll(...refs);
  return snaps.filter((s) => s.exists).map((s) => mapOrder(s.id, s.data()!));
}

export async function listOrders(
  options: { status?: OrderStatus; limit?: number; includeDeleted?: boolean } = {},
): Promise<Order[]> {
  const { status, limit = 300, includeDeleted = false } = options;

  let query: FirebaseFirestore.Query = db.collection(COL.orders);
  if (status) query = query.where('status', '==', status);
  query = query.orderBy('createdAt', 'desc').limit(limit);

  const snap = await query.get();
  const orders = snap.docs.map((d) => mapOrder(d.id, d.data()));
  return includeDeleted ? orders : orders.filter((o) => !o.deleted);
}

/**
 * 고객 배송조회. 입금자명 + 전화번호가 **둘 다 정확히** 일치하는 건만 돌려준다.
 * 취소/삭제 주문은 노출하지 않는다(PRD). 환불·교환은 진행 상태로 그대로 보여준다.
 *
 * 전화번호는 **입금하신 분 번호와 받는 분 번호 어느 쪽이든** 맞으면 찾아준다.
 * 손님은 자기가 주문서에 적은 번호를 넣을 뿐, 그게 둘 중 어느 칸이었는지 기억하지 못한다.
 * (Firestore는 서로 다른 필드의 OR를 한 번에 못 하므로 두 번 조회해 합친다)
 */
export async function lookupOrders(depositorName: string, phone: string): Promise<Order[]> {
  const nameNorm = normalizeName(depositorName ?? '');
  const phoneNorm = normalizePhone(phone ?? '');
  if (!nameNorm || !phoneNorm) return [];

  const byField = (field: 'phoneNorm' | 'depositorPhoneNorm') =>
    db
      .collection(COL.orders)
      .where('depositorNameNorm', '==', nameNorm)
      .where(field, '==', phoneNorm)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

  const [byRecipient, byDepositor] = await Promise.all([
    byField('phoneNorm'),
    byField('depositorPhoneNorm'),
  ]);

  const found = new Map<string, Order>();
  for (const doc of [...byRecipient.docs, ...byDepositor.docs]) {
    if (!found.has(doc.id)) found.set(doc.id, mapOrder(doc.id, doc.data()));
  }

  return [...found.values()]
    .filter((o) => !o.deleted && o.status !== '취소')
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** 입금 매칭 후보: 아직 입금 확인이 안 된 주문 */
export async function listPendingPaymentOrders(limit = 200): Promise<Order[]> {
  return listOrders({ status: '입금대기', limit });
}

/* ────────────────────────────────────────────────────────────
 * 입금 기한이 지난 주문 자동 취소
 * ──────────────────────────────────────────────────────────── */

/**
 * 인스턴스별 마지막 정리 시각.
 *
 * 이 정리는 화면을 그릴 때 곁다리로 돌기 때문에, 요청마다 조회를 날리면 낭비다.
 * 인스턴스가 여러 개여도 각자 1분에 한 번씩만 도는 정도라 문제되지 않는다
 * (같은 주문을 두 번 취소해도 재고는 상태에서 유도하므로 어긋나지 않는다).
 */
const globalForSweep = globalThis as unknown as { __albamLastSweep?: number };
const SWEEP_INTERVAL_MS = 60_000;

/**
 * 입금 기한(24시간)이 지난 입금대기 주문을 취소한다.
 *
 * 취소 처리는 updateOrder를 그대로 쓴다. 재고 복원이 상태에서 유도되므로
 * 여기서 재고를 따로 건드리지 않아도 정확히 한 번만 돌아간다.
 *
 * 별도의 스케줄러 없이 서버가 화면을 그릴 때 함께 돈다. 손님이 상품 목록을 보거나
 * 아버지가 관리자 화면을 열 때마다 정리되므로, 실제로는 계속 도는 셈이다.
 *
 * @param force 스로틀을 무시하고 즉시 실행 (점검·수동 실행용)
 */
export async function expireStaleOrders({ force = false } = {}): Promise<number> {
  const now = Date.now();
  const last = globalForSweep.__albamLastSweep ?? 0;
  if (!force && now - last < SWEEP_INTERVAL_MS) return 0;
  globalForSweep.__albamLastSweep = now;

  const snap = await db
    .collection(COL.orders)
    .where('status', '==', '입금대기')
    .where('createdAt', '<', now - PAYMENT_DEADLINE_MS)
    .limit(50) // 한 번에 너무 많이 붙들지 않는다. 남으면 다음 정리에서 처리된다.
    .get();

  let cancelled = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.deleted) continue;
    try {
      await updateOrder(doc.id, {
        status: '취소',
        // 아버지가 나중에 "왜 취소됐지?" 할 때 볼 단서. 직접 쓴 메모는 덮지 않는다.
        memo: String(data.memo ?? '').trim()
          ? data.memo
          : `입금 기한 ${PAYMENT_DEADLINE_HOURS}시간이 지나 자동으로 취소되었습니다.`,
      });
      cancelled += 1;
    } catch (err) {
      // 한 건이 실패해도 나머지는 계속 정리한다
      console.error('[expireStaleOrders]', doc.id, err);
    }
  }

  return cancelled;
}
