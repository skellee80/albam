'use client';

import { useMemo, useState, useTransition } from 'react';

import { ignoreDepositAction, resolveDepositAction } from '@/app/admin/actions';
import { formatKRW, formatShortDateTime, normalizeName, normalizePhone } from '@/lib/format';
import type { DepositStatus } from '@/lib/types';

import { ConfirmDialog } from './ConfirmDialog';

export type CandidateOrder = {
  id: string;
  orderNo: string;
  depositorName: string;
  recipientName: string;
  phone: string;
  itemsSummary: string;
  totalAmount: number;
};

export type AlertDeposit = {
  id: string;
  amount: number;
  depositorName: string;
  bankName: string;
  status: DepositStatus;
  receivedAt: number;
  candidates: CandidateOrder[];
  /** 판매 계좌가 아닌 은행에서 온 입금 — 우리 돈이 아닐 가능성이 높다 */
  otherBank: boolean;
};

/**
 * 관리자 화면 최상단 빨간 영역: 아직 사람이 손대야 하는 입금.
 *
 * 여기 뭔가 남아 있으면 돈은 들어왔는데 주문이 안 움직이고 있다는 뜻이다.
 * 화면에서 가장 먼저, 가장 크게 보여야 한다.
 */
export function DepositAlerts({
  deposits,
  pendingOrders,
  accountBank,
}: {
  deposits: AlertDeposit[];
  pendingOrders: CandidateOrder[];
  accountBank: string;
}) {
  if (deposits.length === 0) return null;

  return (
    <section className="rounded-card border-2 border-berry/35 bg-berry-tint px-4 py-4">
      <h2 className="flex items-center gap-2 font-display text-[1.2rem] text-berry">
        확인이 필요한 입금 {deposits.length}건
      </h2>
      <p className="mt-1 text-[0.85rem] leading-snug text-ink-soft">
        돈은 들어왔는데 어느 주문인지 정해지지 않았습니다. 아래에서 주문을 골라 주세요.
      </p>

      <div className="mt-3.5 space-y-3">
        {deposits.map((deposit) => (
          <DepositCard
            key={deposit.id}
            deposit={deposit}
            pendingOrders={pendingOrders}
            accountBank={accountBank}
          />
        ))}
      </div>
    </section>
  );
}

function DepositCard({
  deposit,
  pendingOrders,
  accountBank,
}: {
  deposit: AlertDeposit;
  pendingOrders: CandidateOrder[];
  accountBank: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // 확인필요는 서버가 뽑아준 후보가 이미 있으므로 목록을 접어 둔다.
  // 다른 은행 입금도 접어 둔다 — 연결하면 안 되는 건이라 먼저 권하지 않는다.
  const [browsing, setBrowsing] = useState(deposit.status === '미매칭' && !deposit.otherBank);
  const [query, setQuery] = useState('');
  /** 확인 창에 올라와 있는 주문. 누르자마자 처리하지 않고 한 번 물어본다. */
  const [confirming, setConfirming] = useState<CandidateOrder | null>(null);

  /**
   * 입금대기 주문 전체 목록.
   * 금액이 딱 맞는 건을 맨 위로 올린다 — 아버지가 눈으로 금액을 대조하지 않아도 되도록.
   */
  const browseList = useMemo(() => {
    const term = query.trim();
    const nameTerm = normalizeName(term);
    const digitTerm = normalizePhone(term);

    const filtered = term
      ? pendingOrders.filter(
          (o) =>
            (nameTerm && normalizeName(o.depositorName).includes(nameTerm)) ||
            (nameTerm && normalizeName(o.recipientName).includes(nameTerm)) ||
            (digitTerm && normalizePhone(o.phone).includes(digitTerm)),
        )
      : pendingOrders;

    return [...filtered].sort((a, b) => {
      const aExact = a.totalAmount === deposit.amount ? 0 : 1;
      const bExact = b.totalAmount === deposit.amount ? 0 : 1;
      return aExact - bExact;
    });
  }, [pendingOrders, query, deposit.amount]);

  const exactAmountCount = pendingOrders.filter((o) => o.totalAmount === deposit.amount).length;

  function connect(orderId: string) {
    if (!orderId) return;
    setError(null);
    setConfirming(null);
    startTransition(async () => {
      const result = await resolveDepositAction(deposit.id, orderId);
      if (!result.ok) setError(result.error);
    });
  }

  function ignore() {
    setError(null);
    startTransition(async () => {
      const result = await ignoreDepositAction(deposit.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <article className="rounded-2xl bg-surface px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[1.15rem] font-bold">
            {deposit.depositorName}
            <span className="tnum ml-2 text-shell">{formatKRW(deposit.amount)}</span>
          </p>
          <p className="mt-0.5 text-[0.8rem] text-ink-faint">
            {deposit.bankName || '은행 미상'} · {formatShortDateTime(deposit.receivedAt)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1.5 text-[0.75rem] font-bold ${
            deposit.status === '확인필요' ? 'bg-amber-tint text-amber' : 'bg-berry-tint text-berry'
          }`}
        >
          {deposit.status}
        </span>
      </div>

      {deposit.otherBank ? (
        <div className="mt-3 rounded-xl bg-berry-tint px-3.5 py-3">
          <p className="text-[0.88rem] font-bold text-berry">
            판매 계좌({accountBank})가 아닌 {deposit.bankName} 입금입니다
          </p>
          <p className="mt-1 text-[0.83rem] leading-snug text-ink-soft">
            우리 계좌로 들어온 돈이 아닐 수 있습니다. 통장을 먼저 확인하세요. 주문에 연결하면 돈을
            받지 않고 물건을 보내게 됩니다.
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[0.85rem] font-semibold text-ink-soft">
          {deposit.status === '확인필요'
            ? '같은 이름·같은 금액의 주문이 여러 건입니다. 어느 주문인가요?'
            : '자동으로 맞는 주문을 찾지 못했습니다. 아래에서 직접 골라 주세요.'}
        </p>
      )}

      {/* 확인필요: 서버가 뽑아준 후보를 먼저 보여준다 */}
      {deposit.status === '확인필요' && deposit.candidates.length > 0 && (
        <ul className="mt-2.5 space-y-2">
          {deposit.candidates.map((order) => (
            <li key={order.id}>
              <OrderPickButton
                order={order}
                depositAmount={deposit.amount}
                disabled={pending}
                onPick={() => setConfirming(order)}
              />
            </li>
          ))}
        </ul>
      )}

      {/* 입금대기 주문 전체에서 직접 고르기 */}
      <div className="mt-2.5">
        <button
          type="button"
          onClick={() => setBrowsing((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-paper px-3.5 py-3 text-left"
        >
          <span className="text-[0.88rem] font-semibold">
            입금대기 주문에서 고르기
            <span className="tnum ml-1.5 text-ink-soft">{pendingOrders.length}건</span>
            {exactAmountCount > 0 && (
              <span className="ml-1.5 rounded-full bg-burr-tint px-2 py-0.5 text-[0.72rem] font-bold text-burr-deep">
                금액 일치 {exactAmountCount}
              </span>
            )}
          </span>
          <span className="shrink-0 text-ink-faint">{browsing ? '▲' : '▼'}</span>
        </button>

        {browsing &&
          (pendingOrders.length === 0 ? (
            <p className="mt-2 rounded-xl bg-paper px-3.5 py-3 text-[0.85rem] text-ink-soft">
              입금대기 주문이 없습니다. 이미 처리했거나 기한이 지나 취소된 입금일 수 있습니다.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              {pendingOrders.length > 4 && (
                <input
                  className="field"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="이름 · 전화번호로 찾기"
                  aria-label="입금대기 주문 찾기"
                />
              )}

              {browseList.length === 0 ? (
                <p className="rounded-xl bg-paper px-3.5 py-3 text-[0.85rem] text-ink-soft">
                  해당하는 주문이 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {browseList.map((order) => (
                    <li key={order.id}>
                      <OrderPickButton
                        order={order}
                        depositAmount={deposit.amount}
                        disabled={pending}
                        onPick={() => setConfirming(order)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
      </div>

      {error && (
        <p role="alert" className="mt-2.5 text-[0.85rem] font-semibold text-berry">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={ignore}
        disabled={pending}
        className="mt-2.5 w-full rounded-full px-3 py-2 text-[0.82rem] font-semibold text-ink-faint underline underline-offset-2"
      >
        내 입금이 아님 · 목록에서 치우기
      </button>

      <ConfirmDialog
        open={confirming !== null}
        title="이 주문을 입금 완료로 처리할까요?"
        confirmLabel="예, 입금 완료"
        cancelLabel="아니요"
        pending={pending}
        onConfirm={() => connect(confirming!.id)}
        onCancel={() => setConfirming(null)}
      >
        {confirming && (
          <ResolveSummary deposit={deposit} order={confirming} otherBank={deposit.otherBank} />
        )}
      </ConfirmDialog>
    </article>
  );
}

/**
 * 확인 창 본문: 들어온 입금과 고른 주문을 나란히 놓는다.
 *
 * 자동으로 못 맞춘 건이라 사람이 판단해야 하는데, 그 판단에 필요한 값
 * (입금자·수신자·금액)이 한 화면에 없으면 결국 감으로 누르게 된다.
 */
function ResolveSummary({
  deposit,
  order,
  otherBank,
}: {
  deposit: AlertDeposit;
  order: CandidateOrder;
  otherBank: boolean;
}) {
  const amountMatches = deposit.amount === order.totalAmount;
  const nameMatches = normalizeName(deposit.depositorName) === normalizeName(order.depositorName);

  return (
    <div className="space-y-3">
      <dl className="overflow-hidden rounded-xl border border-line">
        <Row label="들어온 입금" value={`${deposit.depositorName} · ${formatKRW(deposit.amount)}`} />
        <Row label="입금자" value={order.depositorName} warn={!nameMatches} />
        <Row label="받는 분" value={order.recipientName} />
        <Row label="연락처" value={order.phone} mono />
        <Row label="주문 상품" value={order.itemsSummary} />
        <Row label="주문 금액" value={formatKRW(order.totalAmount)} warn={!amountMatches} mono />
      </dl>

      {/* 자동 매칭이 실패한 이유를 짚어 준다 */}
      {(!amountMatches || !nameMatches) && (
        <ul className="space-y-1 rounded-xl bg-amber-tint px-3.5 py-3 text-[0.83rem] leading-snug text-amber">
          {!nameMatches && (
            <li>
              입금자명이 다릅니다 — 입금 <b>{deposit.depositorName}</b> / 주문{' '}
              <b>{order.depositorName}</b>
            </li>
          )}
          {!amountMatches && (
            <li>
              금액이 다릅니다 — 입금 <b>{formatKRW(deposit.amount)}</b> / 주문{' '}
              <b>{formatKRW(order.totalAmount)}</b>
            </li>
          )}
        </ul>
      )}

      {otherBank && (
        <p className="rounded-xl bg-berry-tint px-3.5 py-3 text-[0.83rem] leading-snug font-semibold text-berry">
          판매 계좌가 아닌 은행에서 온 입금입니다. 통장에 실제로 들어왔는지 먼저 확인하세요.
        </p>
      )}

      <div className="rounded-xl border-2 border-berry/35 bg-berry-tint px-3.5 py-3">
        <p className="text-[0.88rem] font-bold text-berry">📞 전화로 먼저 확인하세요</p>
        <p className="mt-1 text-[0.83rem] leading-relaxed text-ink-soft">
          <b className="tnum text-ink">{order.phone}</b> 로 연락해서 <b>입금자·받는 분·입금액</b>이
          맞는지 확인한 뒤 눌러 주세요. 잘못 연결하면 <b>돈을 받지 않고 물건을 보내게 됩니다.</b>
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  warn,
  mono,
}: {
  label: string;
  value: string;
  warn?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-3 border-b border-line px-3.5 py-2 last:border-b-0">
      <dt className="w-[4.5rem] shrink-0 text-[0.8rem] text-ink-faint">{label}</dt>
      <dd
        className={`min-w-0 flex-1 text-[0.88rem] ${mono ? 'tnum' : ''} ${
          warn ? 'font-bold text-amber' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * 주문 한 건을 골라 입금을 확정하는 버튼.
 *
 * 입금액과 주문 금액이 같으면 표시해 준다. 아버지가 두 숫자를 눈으로 대조하는 대신
 * 화면이 먼저 알려주는 쪽이 실수가 적다.
 */
function OrderPickButton({
  order,
  depositAmount,
  disabled,
  onPick,
}: {
  order: CandidateOrder;
  depositAmount: number;
  disabled: boolean;
  onPick: () => void;
}) {
  const exact = order.totalAmount === depositAmount;

  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={`w-full rounded-xl border bg-paper px-3.5 py-3 text-left transition-colors hover:border-burr disabled:opacity-50 ${
        exact ? 'border-burr/60 bg-burr-tint/40' : 'border-line'
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="min-w-0">
          <span className="text-[0.72rem] text-ink-faint">입금자 </span>
          <b>{order.depositorName}</b>
        </span>
        <span className="tnum shrink-0 text-[0.85rem] text-ink-soft">{order.phone}</span>
      </span>

      {/* 받는 분은 입금자와 같더라도 늘 보여준다 — 전화로 확인할 때 필요한 값이다 */}
      <span className="mt-0.5 block text-[0.85rem]">
        <span className="text-[0.72rem] text-ink-faint">받는 분 </span>
        <b>{order.recipientName}</b>
      </span>

      <span className="mt-1 flex items-baseline justify-between gap-2 text-[0.82rem] text-ink-soft">
        <span className="truncate">{order.itemsSummary}</span>
        <span className={`tnum shrink-0 font-semibold ${exact ? 'text-burr-deep' : ''}`}>
          {formatKRW(order.totalAmount)}
          {exact && <span className="ml-1 text-[0.72rem]">금액 일치</span>}
        </span>
      </span>
    </button>
  );
}
