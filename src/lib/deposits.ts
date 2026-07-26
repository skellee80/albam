import 'server-only';

import crypto from 'node:crypto';

import { COL, db, toMillis, toMillisOr } from './firebase-admin';
import { formatKRW, normalizeName, summarizeItems } from './format';
import {
  UNRESOLVED_DEPOSIT_STATUSES,
  type Deposit,
  type DepositStatus,
  type OrderStatus,
} from './types';

/* ────────────────────────────────────────────────────────────
 * 중복 방지
 * ──────────────────────────────────────────────────────────── */

const BUCKET_MS = 60_000;

/**
 * 같은 입금 문자가 두 번 도착하는 일은 흔하다(알림 재표시, MacroDroid 재시도).
 * (금액·입금자명·은행·분) 을 해시해 **문서 ID로** 쓰면
 * 두 번째 요청이 같은 문서를 만나 원자적으로 무시된다.
 */
function dedupeKey(amount: number, nameNorm: string, bankNorm: string, bucket: number): string {
  return crypto
    .createHash('sha256')
    .update(`${amount}|${nameNorm}|${bankNorm}|${bucket}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * 분 경계를 사이에 두고 도착한 재전송(10:00:59 / 10:01:01)을 놓치지 않도록
 * 직전 분 버킷까지 함께 확인한다. 실질 중복 판정 창은 약 2분.
 */
function dedupeKeysToCheck(amount: number, nameNorm: string, bankNorm: string, at: number) {
  const bucket = Math.floor(at / BUCKET_MS);
  return [
    dedupeKey(amount, nameNorm, bankNorm, bucket),
    dedupeKey(amount, nameNorm, bankNorm, bucket - 1),
  ];
}

/* ────────────────────────────────────────────────────────────
 * 매핑
 * ──────────────────────────────────────────────────────────── */

function mapDeposit(id: string, data: FirebaseFirestore.DocumentData): Deposit {
  return {
    id,
    amount: Number(data.amount ?? 0),
    depositorName: data.depositorName ?? '',
    depositorNameNorm: data.depositorNameNorm ?? '',
    bankName: data.bankName ?? '',
    status: (data.status ?? '미매칭') as DepositStatus,
    matchedOrderId: data.matchedOrderId ?? null,
    candidateOrderIds: Array.isArray(data.candidateOrderIds) ? data.candidateOrderIds : [],
    responseText: data.responseText ?? '',
    receivedAt: toMillisOr(data.receivedAt, Date.now()),
    resolvedAt: toMillis(data.resolvedAt),
  };
}

/* ────────────────────────────────────────────────────────────
 * 입금 수신 · 자동 매칭
 * ──────────────────────────────────────────────────────────── */

export type DepositInput = {
  amount: number;
  depositorName: string;
  bankName: string;
};

export type DepositResult = {
  ok: boolean;
  status: DepositStatus | null;
  /** MacroDroid가 알림으로 그대로 띄울 한 줄 문구 */
  message: string;
  depositId: string | null;
  duplicate: boolean;
};

/**
 * MacroDroid가 보낸 입금 1건을 기록하고 주문과 매칭한다.
 *
 * 매칭 조건은 **입금자명과 금액이 둘 다 정확히 일치**하는 입금대기 주문.
 *   1건  → 발송대기로 확정
 *   여러 건 → 확인필요 (동명이인, 관리자가 후보 중 선택)
 *   0건  → 미매칭 (관리자가 수동 연결)
 *
 * 매칭에 실패해도 반드시 기록을 남긴다. 나중에 추적할 유일한 단서다.
 */
export async function recordDeposit(input: DepositInput): Promise<DepositResult> {
  const amount = Math.round(Number(input.amount));
  const depositorName = (input.depositorName ?? '').trim();
  const bankName = (input.bankName ?? '').trim();
  const nameNorm = normalizeName(depositorName);
  const bankNorm = normalizeName(bankName);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: null, message: '❌ 입금액을 읽지 못했습니다.', depositId: null, duplicate: false };
  }
  if (!nameNorm) {
    return { ok: false, status: null, message: '❌ 입금자명을 읽지 못했습니다.', depositId: null, duplicate: false };
  }

  const now = Date.now();
  const keys = dedupeKeysToCheck(amount, nameNorm, bankNorm, now);

  return db.runTransaction<DepositResult>(async (t) => {
    // ── 읽기 ──
    const depositRefs = keys.map((k) => db.collection(COL.deposits).doc(k));
    const depositSnaps = await t.getAll(...depositRefs);
    const alreadySeen = depositSnaps.find((s) => s.exists);

    if (alreadySeen) {
      // 재전송. 처음 돌려줬던 문구를 그대로 다시 준다.
      const prev = mapDeposit(alreadySeen.id, alreadySeen.data()!);
      return {
        ok: true,
        status: prev.status,
        message: prev.responseText,
        depositId: prev.id,
        duplicate: true,
      };
    }

    const candidateSnap = await t.get(
      db
        .collection(COL.orders)
        .where('status', '==', '입금대기')
        .where('depositorNameNorm', '==', nameNorm)
        .where('totalAmount', '==', amount),
    );
    // 삭제된 주문은 메모리에서 걸러낸다 (인덱스를 늘리지 않으려고)
    const candidates = candidateSnap.docs.filter((d) => !d.data().deleted);

    // ── 판정 ──
    let status: DepositStatus;
    let message: string;
    let matchedOrderId: string | null = null;
    const candidateOrderIds: string[] = candidates.map((d) => d.id);

    if (candidates.length === 1) {
      const orderDoc = candidates[0];
      const orderData = orderDoc.data();
      matchedOrderId = orderDoc.id;
      status = '확정';

      const items = Array.isArray(orderData.items) ? orderData.items : [];
      const summary = summarizeItems(items);
      message = `✅ 확정: ${depositorName}님 ${formatKRW(amount)} → 발송대기${summary ? ` (${summary})` : ''}`;

      // 입금대기 → 발송대기는 둘 다 재고를 잡고 있는 상태라 재고 변동이 없다.
      // 이미 트랜잭션 안이므로 여기서 직접 갱신한다.
      t.update(orderDoc.ref, {
        status: '발송대기' satisfies OrderStatus,
        paidAt: now,
        updatedAt: now,
      });
    } else if (candidates.length > 1) {
      status = '확인필요';
      message = `⚠️ 확인필요: ${depositorName} ${formatKRW(amount)}, 후보 ${candidates.length}건. 관리자에서 선택하세요.`;
    } else {
      status = '미매칭';
      message = `❓ 미매칭: ${depositorName} ${formatKRW(amount)}. 관리자에서 확인하세요.`;
    }

    // ── 쓰기 ──
    t.set(depositRefs[0], {
      amount,
      depositorName,
      depositorNameNorm: nameNorm,
      bankName,
      status,
      matchedOrderId,
      candidateOrderIds,
      responseText: message,
      receivedAt: now,
      resolvedAt: status === '확정' ? now : null,
    });

    return { ok: true, status, message, depositId: depositRefs[0].id, duplicate: false };
  });
}

/* ────────────────────────────────────────────────────────────
 * 관리자 처리
 * ──────────────────────────────────────────────────────────── */

/**
 * 확인필요(동명이인) 또는 미매칭 입금을 특정 주문에 연결한다.
 * 해당 주문을 발송대기로 올리고 입금 건을 확정 처리한다.
 */
export async function resolveDeposit(depositId: string, orderId: string): Promise<void> {
  await db.runTransaction(async (t) => {
    const depositRef = db.collection(COL.deposits).doc(depositId);
    const orderRef = db.collection(COL.orders).doc(orderId);
    const [depositSnap, orderSnap] = await t.getAll(depositRef, orderRef);

    if (!depositSnap.exists) throw new Error('입금 내역을 찾을 수 없습니다.');
    if (!orderSnap.exists) throw new Error('주문을 찾을 수 없습니다.');

    const now = Date.now();
    const order = orderSnap.data()!;

    // 입금대기 → 발송대기 (재고를 잡고 있는 상태끼리의 이동이라 재고 변동 없음)
    if (order.status === '입금대기') {
      t.update(orderRef, { status: '발송대기' satisfies OrderStatus, paidAt: now, updatedAt: now });
    }

    t.update(depositRef, {
      status: '확정' satisfies DepositStatus,
      matchedOrderId: orderId,
      resolvedAt: now,
    });
  });
}

/** 내 입금이 아니거나 처리할 필요가 없는 건을 목록에서 치운다. */
export async function ignoreDeposit(depositId: string): Promise<void> {
  await db.collection(COL.deposits).doc(depositId).update({
    status: '무시' satisfies DepositStatus,
    resolvedAt: Date.now(),
  });
}

/** 관리자 대시보드 최상단에 띄울 미해결 입금 (확인필요 / 미매칭) */
export async function listUnresolvedDeposits(limit = 50): Promise<Deposit[]> {
  const snap = await db
    .collection(COL.deposits)
    .where('status', 'in', [...UNRESOLVED_DEPOSIT_STATUSES])
    .orderBy('receivedAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => mapDeposit(d.id, d.data()));
}

export async function listDeposits(limit = 100): Promise<Deposit[]> {
  const snap = await db
    .collection(COL.deposits)
    .orderBy('receivedAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => mapDeposit(d.id, d.data()));
}
