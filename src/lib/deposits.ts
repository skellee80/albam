import 'server-only';

import crypto from 'node:crypto';

import { COL, db, toMillis, toMillisOr } from './firebase-admin';
import { formatKRW, normalizeName, summarizeItems } from './format';
import { getSettings } from './settings';
import { detectBank } from './sms';
import {
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
    rawText: data.rawText ?? '',
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
  /**
   * 문자 원문. 서버가 해석한 경우에만 들어온다.
   *
   * **확정된 건에는 남기지 않는다.** 원문에는 계좌번호와 잔액이 들어 있어서
   * 굳이 쌓아둘 이유가 없다. 사람이 들여다봐야 하는 건(확인필요·미매칭)에만 남겨
   * 왜 안 맞았는지 볼 수 있게 한다.
   */
  rawText?: string;
};

export type DepositResult = {
  ok: boolean;
  status: DepositStatus | null;
  /** MacroDroid가 알림으로 그대로 띄울 한 줄 문구 */
  message: string;
  depositId: string | null;
  duplicate: boolean;
};

/* ────────────────────────────────────────────────────────────
 * 은행 대조
 * ──────────────────────────────────────────────────────────── */

/**
 * 은행명 정규화. "NH농협은행", "농협 은행", "농협" 을 모두 같게 본다.
 * 문자에 찍히는 표기가 은행·기기마다 달라서 글자 그대로 비교하면 거의 안 맞는다.
 */
function normalizeBank(value: string): string {
  return value
    .normalize('NFC')
    .replace(/\s+/g, '')
    .replace(/은행$/, '')
    .toLowerCase();
}

/**
 * 입금 문자의 은행이 **설정에 적어 둔 입금 계좌의 은행과 같은지** 본다.
 *
 * 주문에는 은행 정보가 없다(손님이 어느 은행에서 보낼지 미리 알 수 없다).
 * 대조할 수 있는 건 "이 입금이 우리 판매 계좌로 들어온 게 맞는가" 하나뿐이고,
 * 그게 실제로 걸러야 하는 것이기도 하다 — 다른 계좌 입금 문자가 섞여 들어오면
 * 엉뚱한 주문이 발송대기로 올라간다.
 *
 * 한쪽이 비어 있으면 판단하지 않고 통과시킨다. 설정을 아직 안 했다고 해서
 * 멀쩡한 입금을 막으면 안 된다.
 */
export function banksMatch(depositBank: string, accountBank: string): boolean {
  const a = normalizeBank(depositBank ?? '');
  const b = normalizeBank(accountBank ?? '');
  if (!a || !b) return true;
  return a === b || a.includes(b) || b.includes(a);
}

/** 후보 주문에서 판정에 필요한 것만 추린 모양 */
type Candidate = { id: string; itemsSummary: string };

type Decision = {
  status: DepositStatus;
  message: string;
  matchedOrderId: string | null;
  candidateOrderIds: string[];
};

/**
 * 입금 1건을 어떻게 처리할지 정한다.
 *
 * 실제 처리(recordDeposit)와 미리보기(previewDeposit)가 **같은 함수**를 쓴다.
 * 판정 규칙이 두 벌이면 미리보기가 거짓말을 하게 되고, 그러면 테스트가 무의미해진다.
 *
 * | 이름 | 금액 | 결과 |
 * |---|---|---|
 * | 맞음 | 맞음 | 1건이면 **확정**, 여러 건이면 **확인필요**(동명이인) |
 * | 맞음 | 다름 | **확인필요** |
 * | 다름 | 맞음 | **확인필요** |
 * | 다름 | 다름 | **미매칭** |
 *
 * **한쪽만 맞아도 확인필요로 올리는 이유**: 손님이 이름을 조금 다르게 적었거나
 * (`김지수` ↔ `김지수님`) 금액을 잘못 보낸 경우가 실제로 있다. 그걸 미매칭으로
 * 묻어 두면 돈은 들어왔는데 아무도 모르는 상태가 된다. 사람이 한 번 보면 될 일이다.
 */
function decide(exact: Candidate[], partial: Candidate[], depositorName: string, amount: number): Decision {
  if (exact.length === 1) {
    const only = exact[0];
    return {
      status: '확정',
      message: `✅ 발송확정: ${depositorName}님 ${formatKRW(amount)} → 발송대기${only.itemsSummary ? ` (${only.itemsSummary})` : ''}`,
      matchedOrderId: only.id,
      candidateOrderIds: exact.map((c) => c.id),
    };
  }

  if (exact.length > 1) {
    return {
      status: '확인필요',
      message: `⚠️ 확인필요: ${depositorName} ${formatKRW(amount)}, 후보 ${exact.length}건. 관리자에서 선택하세요.`,
      matchedOrderId: null,
      candidateOrderIds: exact.map((c) => c.id),
    };
  }

  if (partial.length > 0) {
    return {
      status: '확인필요',
      message: `⚠️ 확인필요: ${depositorName} ${formatKRW(amount)} — 이름 또는 금액만 맞는 주문 ${partial.length}건. 관리자에서 확인하세요.`,
      matchedOrderId: null,
      candidateOrderIds: partial.map((c) => c.id),
    };
  }

  return {
    status: '미매칭',
    message: `❓ 미매칭: ${depositorName} ${formatKRW(amount)}. 관리자에서 확인하세요.`,
    matchedOrderId: null,
    candidateOrderIds: [],
  };
}

/** 우리 계좌가 아닌 은행에서 온 입금 — 주문을 찾아보지도 않는다 */
function otherBankDecision(
  depositorName: string,
  amount: number,
  depositBank: string,
  accountBank: string,
): Decision {
  return {
    status: '미매칭',
    message: `❓ 미매칭: ${depositorName} ${formatKRW(amount)} — ${depositBank} 입금입니다. 판매 계좌는 ${accountBank}입니다.`,
    matchedOrderId: null,
    candidateOrderIds: [],
  };
}

/**
 * 입금대기 주문 중 이름·금액이 정확히 일치하는 건 (삭제된 주문 제외).
 *
 * 주문마다 따로 입금받는다. 여러 건을 한 번에 보내면 어느 주문과도 금액이 맞지 않아
 * 미매칭이 되고, 그건 관리자가 손으로 처리한다.
 */
function matchQuery(nameNorm: string, amount: number) {
  return db
    .collection(COL.orders)
    .where('status', '==', '입금대기')
    .where('depositorNameNorm', '==', nameNorm)
    .where('totalAmount', '==', amount);
}

/**
 * 한쪽만 맞는 입금대기 주문 — 이름만 맞거나, 금액만 맞거나.
 *
 * 정확히 맞는 주문이 없을 때만 찾아본다. 사람이 한 번 보라고 올리는 용도라
 * 넉넉히 잡을 필요가 없어 각각 스무 건까지만 본다
 * (입금대기 주문이 스무 건 넘게 쌓여 있으면 그것부터 볼 일이다).
 */
const PARTIAL_MATCH_LIMIT = 20;

function nameOnlyQuery(nameNorm: string) {
  return db
    .collection(COL.orders)
    .where('status', '==', '입금대기')
    .where('depositorNameNorm', '==', nameNorm)
    .limit(PARTIAL_MATCH_LIMIT);
}

function amountOnlyQuery(amount: number) {
  return db
    .collection(COL.orders)
    .where('status', '==', '입금대기')
    .where('totalAmount', '==', amount)
    .limit(PARTIAL_MATCH_LIMIT);
}

/** 이름 질의와 금액 질의 결과를 합친다. 둘 다 걸린 주문이 두 번 나오지 않게 id 로 묶는다. */
function mergeDocs(
  ...groups: FirebaseFirestore.QueryDocumentSnapshot[][]
): FirebaseFirestore.QueryDocumentSnapshot[] {
  const byId = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
  for (const docs of groups) {
    for (const doc of docs) {
      if (!doc.data().deleted) byId.set(doc.id, doc);
    }
  }
  return [...byId.values()];
}

function toCandidate(doc: FirebaseFirestore.QueryDocumentSnapshot): Candidate {
  const data = doc.data();
  return {
    id: doc.id,
    itemsSummary: summarizeItems(Array.isArray(data.items) ? data.items : []),
  };
}

/**
 * MacroDroid가 보낸 입금 1건을 기록하고 주문과 매칭한다.
 *
 * 이름과 금액이 **둘 다** 맞는 입금대기 주문을 먼저 찾는다.
 *   1건  → 발송대기로 확정
 *   여러 건 → 확인필요 (동명이인, 관리자가 후보 중 선택)
 *   0건  → 이름만 또는 금액만 맞는 주문을 찾아 **확인필요**로 올린다
 *          그것도 없으면 미매칭
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

  // 트랜잭션 밖에서 미리 읽는다. 계좌 설정은 거의 바뀌지 않아 경합할 일이 없다.
  const accountBank = (await getSettings()).bankName;
  const sameBank = banksMatch(bankName, accountBank);

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

    // 은행이 다르면 우리 계좌 입금이 아니므로 주문을 찾아보지 않는다
    const matched = sameBank
      ? (await t.get(matchQuery(nameNorm, amount))).docs.filter((d) => !d.data().deleted)
      : [];

    /*
      정확히 맞는 주문이 없을 때만 한쪽만 맞는 주문을 찾아본다.
      트랜잭션은 읽기를 모두 쓰기보다 먼저 해야 하므로 여기서 마친다.
    */
    let partial: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (sameBank && matched.length === 0) {
      const byName = await t.get(nameOnlyQuery(nameNorm));
      const byAmount = await t.get(amountOnlyQuery(amount));
      partial = mergeDocs(byName.docs, byAmount.docs);
    }

    // ── 판정 ──
    const decision = sameBank
      ? decide(matched.map(toCandidate), partial.map(toCandidate), depositorName, amount)
      : otherBankDecision(depositorName, amount, bankName, accountBank);

    // ── 쓰기 ──
    if (decision.matchedOrderId) {
      const orderDoc = matched.find((d) => d.id === decision.matchedOrderId)!;
      // 입금대기 → 발송대기는 둘 다 재고를 잡고 있는 상태라 재고 변동이 없다.
      // 이미 트랜잭션 안이므로 여기서 직접 갱신한다.
      t.update(orderDoc.ref, {
        status: '발송대기' satisfies OrderStatus,
        paidAt: now,
        updatedAt: now,
      });
    }

    t.set(depositRefs[0], {
      amount,
      depositorName,
      depositorNameNorm: nameNorm,
      bankName,
      status: decision.status,
      matchedOrderId: decision.matchedOrderId,
      candidateOrderIds: decision.candidateOrderIds,
      responseText: decision.message,
      // 확정된 건은 원문을 버린다 (계좌번호·잔액이 들어 있어 쌓아둘 이유가 없다)
      rawText: decision.status === '확정' ? '' : (input.rawText ?? ''),
      receivedAt: now,
      resolvedAt: decision.status === '확정' ? now : null,
    });

    return {
      ok: true,
      status: decision.status,
      message: decision.message,
      depositId: depositRefs[0].id,
      duplicate: false,
    };
  });
}

/**
 * 문자를 해석하지 못했을 때도 기록을 남긴다.
 *
 * 조용히 버리면 돈은 들어왔는데 아무도 모르는 상태가 된다.
 * 원문을 남겨야 관리자 화면에서 보고 해석 규칙을 고칠 수 있다.
 */
export async function recordUnparsedDeposit(rawText: string, reason: string): Promise<void> {
  const now = Date.now();
  const key = dedupeKey(0, normalizeName(rawText).slice(0, 60), '', Math.floor(now / BUCKET_MS));

  await db
    .collection(COL.deposits)
    .doc(key)
    .set({
      amount: 0,
      depositorName: '(문자 해석 실패)',
      depositorNameNorm: '',
      bankName: detectBank(rawText),
      rawText,
      status: '미매칭' satisfies DepositStatus,
      matchedOrderId: null,
      candidateOrderIds: [],
      responseText: `❓ 문자를 읽지 못했습니다: ${reason}`,
      receivedAt: now,
      resolvedAt: null,
    });
}

/* ────────────────────────────────────────────────────────────
 * 미리보기 — 아무것도 바꾸지 않고 결과만 보여준다
 * ──────────────────────────────────────────────────────────── */

export type DepositPreview = {
  ok: boolean;
  status: DepositStatus | null;
  /** 실제로 보냈다면 MacroDroid에 떴을 문구 */
  message: string;
  /** 이미 같은 입금이 들어와 중복으로 걸릴 상태인지 */
  duplicate: boolean;
  /** 이름·금액이 맞아떨어진 주문들 */
  candidates: { id: string; orderNo: string; recipientName: string; phone: string }[];
};

/**
 * 같은 판정 규칙을 그대로 돌려보되 **읽기만 한다.**
 *
 * 테스트하려고 주문 상태를 실제로 바꿔 버리면, 입금도 안 된 주문이 발송대기로 올라가
 * 아버지가 그냥 물건을 부칠 수 있다. 그래서 확인은 기본적으로 미리보기로 한다.
 */
export async function previewDeposit(input: DepositInput): Promise<DepositPreview> {
  const amount = Math.round(Number(input.amount));
  const depositorName = (input.depositorName ?? '').trim();
  const bankName = (input.bankName ?? '').trim();
  const nameNorm = normalizeName(depositorName);
  const bankNorm = normalizeName(bankName);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: null, message: '❌ 입금액을 읽지 못했습니다.', duplicate: false, candidates: [] };
  }
  if (!nameNorm) {
    return { ok: false, status: null, message: '❌ 입금자명을 읽지 못했습니다.', duplicate: false, candidates: [] };
  }

  const keys = dedupeKeysToCheck(amount, nameNorm, bankNorm, Date.now());
  const [dedupeSnaps, candidateSnap, settings] = await Promise.all([
    db.getAll(...keys.map((k) => db.collection(COL.deposits).doc(k))),
    matchQuery(nameNorm, amount).get(),
    getSettings(),
  ]);

  const alreadySeen = dedupeSnaps.find((s) => s.exists);
  if (alreadySeen) {
    const prev = mapDeposit(alreadySeen.id, alreadySeen.data()!);
    return {
      ok: true,
      status: prev.status,
      message: prev.responseText,
      duplicate: true,
      candidates: [],
    };
  }

  const sameBank = banksMatch(bankName, settings.bankName);
  const exact = sameBank ? candidateSnap.docs.filter((d) => !d.data().deleted) : [];

  // 정확히 맞는 주문이 없으면 한쪽만 맞는 주문도 찾아본다 (recordDeposit 과 같은 규칙)
  let partial: FirebaseFirestore.QueryDocumentSnapshot[] = [];
  if (sameBank && exact.length === 0) {
    const [byName, byAmount] = await Promise.all([
      nameOnlyQuery(nameNorm).get(),
      amountOnlyQuery(amount).get(),
    ]);
    partial = mergeDocs(byName.docs, byAmount.docs);
  }

  const decision = sameBank
    ? decide(exact.map(toCandidate), partial.map(toCandidate), depositorName, amount)
    : otherBankDecision(depositorName, amount, bankName, settings.bankName);

  // 화면에 보여줄 후보는 판정이 고른 쪽이다
  const matched = exact.length > 0 ? exact : partial;

  return {
    ok: true,
    status: decision.status,
    message: decision.message,
    duplicate: false,
    candidates: matched.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        orderNo: data.orderNo ?? d.id,
        recipientName: data.recipient?.name ?? '',
        phone: data.recipient?.phone ?? '',
      };
    }),
  };
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

/**
 * 관리자 화면 **맨 위 빨간 영역**에 띄울 입금 — `확인필요` 뿐이다.
 *
 * 같은 이름·같은 금액의 입금대기 주문이 여러 건이라 사람이 하나를 골라야 하는 건이다.
 * 아버지가 지금 손대야 하는 일이 맞다.
 *
 * `미매칭` 은 여기 넣지 않는다. 아버지 개인 계좌라 가족 송금·다른 거래 문자가 섞여
 * 들어오는데, 그것까지 맨 위 빨간 영역에 쌓이면 정작 급한 확인필요가 묻힌다.
 * 아래 listUnmatchedDeposits 참고.
 */
export async function listDepositsNeedingChoice(limit = 50): Promise<Deposit[]> {
  const snap = await db
    .collection(COL.deposits)
    .where('status', '==', '확인필요' satisfies DepositStatus)
    .orderBy('receivedAt', 'desc')
    .limit(limit)
    .get();
  return snap.docs.map((d) => mapDeposit(d.id, d.data()));
}

/**
 * 어느 주문에도 붙지 않은 문자 — `미매칭`.
 *
 * 우리 주문과 상관없는 입금(가족 송금 등)과, 서버가 읽지 못한 문자가 함께 들어온다.
 * **참고용이다.** 관리자 화면 맨 아래에 접어 두고, 궁금할 때만 펴 본다.
 *
 * 최신순으로 준다 — 방금 온 문자를 찾으려고 아래까지 내려갈 이유가 없다.
 */
export async function listUnmatchedDeposits(limit = 50): Promise<Deposit[]> {
  const snap = await db
    .collection(COL.deposits)
    .where('status', '==', '미매칭' satisfies DepositStatus)
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
