'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { markShippedAction } from '@/app/admin/actions';
import { formatKRW, formatShortDateTime } from '@/lib/format';

export type ShipItem = {
  id: string;
  orderNo: string;
  recipientName: string;
  phone: string;
  address: string;
  itemsSummary: string;
  totalAmount: number;
  paidAt: number | null;
};

/**
 * 발송대기 목록.
 * 아버지가 택배를 부치고 나서 송장번호를 넣고 버튼 한 번 누르면 끝나야 한다.
 */
export function ShipQueue({ orders }: { orders: ShipItem[] }) {
  return (
    <section>
      <h2 className="px-1 font-display text-[1.2rem]">
        보낼 주문 <span className="tnum text-burr">{orders.length}</span>건
      </h2>

      {orders.length === 0 ? (
        <p className="card mt-2.5 px-5 py-8 text-center text-ink-soft">
          보낼 주문이 없습니다.
        </p>
      ) : (
        <ul className="mt-2.5 space-y-3">
          {orders.map((order) => (
            <ShipCard key={order.id} order={order} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ShipCard({ order }: { order: ShipItem }) {
  const [trackingNo, setTrackingNo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ship() {
    setError(null);
    startTransition(async () => {
      const result = await markShippedAction(order.id, trackingNo);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className="card px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <b className="text-[1.1rem]">{order.recipientName}</b>
        <span className="tnum text-[0.95rem] font-semibold text-shell">
          {formatKRW(order.totalAmount)}
        </span>
      </div>

      <p className="tnum mt-0.5 text-[0.9rem] text-ink-soft">{order.phone}</p>
      <p className="mt-2 rounded-xl bg-paper px-3.5 py-2.5 text-[0.9rem] leading-snug">
        {order.address}
      </p>
      <p className="mt-2 text-[0.88rem] font-semibold text-burr-deep">{order.itemsSummary}</p>
      <p className="tnum mt-1 text-[0.75rem] text-ink-faint">
        주문 {order.orderNo}
        {order.paidAt ? ` · 입금 확인 ${formatShortDateTime(order.paidAt)}` : ''}
      </p>

      <div className="mt-3.5 flex gap-2">
        <input
          className="field tnum flex-1"
          value={trackingNo}
          onChange={(e) => setTrackingNo(e.target.value)}
          placeholder="송장번호 (없으면 비워도 됩니다)"
          inputMode="numeric"
          aria-label={`${order.recipientName} 송장번호`}
        />
        <button type="button" onClick={ship} disabled={pending} className="btn btn-primary shrink-0 px-5">
          {pending ? '처리 중…' : '발송완료'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[0.85rem] font-semibold text-berry">
          {error}
        </p>
      )}

      <Link
        href={`/admin/orders/${order.id}`}
        className="mt-2.5 inline-block text-[0.82rem] text-ink-faint underline underline-offset-2"
      >
        주문 자세히 보기 · 고치기
      </Link>
    </li>
  );
}
