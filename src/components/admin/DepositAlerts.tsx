'use client';

import { useState, useTransition } from 'react';

import { ignoreDepositAction, resolveDepositAction } from '@/app/admin/actions';
import { formatKRW, formatShortDateTime } from '@/lib/format';
import type { DepositStatus } from '@/lib/types';

export type CandidateOrder = {
  id: string;
  orderNo: string;
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
}: {
  deposits: AlertDeposit[];
  pendingOrders: CandidateOrder[];
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
          <DepositCard key={deposit.id} deposit={deposit} pendingOrders={pendingOrders} />
        ))}
      </div>
    </section>
  );
}

function DepositCard({
  deposit,
  pendingOrders,
}: {
  deposit: AlertDeposit;
  pendingOrders: CandidateOrder[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  // 확인필요는 서버가 뽑아준 후보만, 미매칭은 입금대기 주문 전체에서 고른다.
  const options = deposit.status === '확인필요' ? deposit.candidates : pendingOrders;

  function connect(orderId: string) {
    if (!orderId) return;
    setError(null);
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

      <p className="mt-3 text-[0.85rem] font-semibold text-ink-soft">
        {deposit.status === '확인필요'
          ? '같은 이름·같은 금액의 주문이 여러 건입니다. 어느 주문인가요?'
          : '금액이나 이름이 맞는 주문이 없습니다. 직접 골라 연결하세요.'}
      </p>

      {options.length === 0 ? (
        <p className="mt-2.5 rounded-xl bg-paper px-3.5 py-3 text-[0.85rem] text-ink-soft">
          연결할 입금대기 주문이 없습니다. 주문 화면에서 확인한 뒤 무시해도 됩니다.
        </p>
      ) : deposit.status === '확인필요' ? (
        <ul className="mt-2.5 space-y-2">
          {options.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => connect(order.id)}
                disabled={pending}
                className="w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-left transition-colors hover:border-burr disabled:opacity-50"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <b>{order.recipientName}</b>
                  <span className="tnum text-[0.85rem] text-ink-soft">{order.phone}</span>
                </span>
                <span className="mt-1 flex items-baseline justify-between gap-2 text-[0.82rem] text-ink-soft">
                  <span>{order.itemsSummary}</span>
                  <span className="tnum">{formatKRW(order.totalAmount)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-2.5 space-y-2">
          <select
            className="field"
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            aria-label="연결할 주문 고르기"
          >
            <option value="">주문을 고르세요</option>
            {options.map((order) => (
              <option key={order.id} value={order.id}>
                {order.recipientName} · {order.itemsSummary} · {formatKRW(order.totalAmount)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => connect(selectedOrderId)}
            disabled={pending || !selectedOrderId}
            className="btn btn-primary w-full"
          >
            이 주문에 연결하고 발송대기로
          </button>
        </div>
      )}

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
    </article>
  );
}
