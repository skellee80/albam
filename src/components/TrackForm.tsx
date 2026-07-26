'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { findOrders, type TrackedOrder } from '@/app/(shop)/track/actions';
import { formatDate, formatDateTime, formatKRW } from '@/lib/format';
import { paymentDueAt } from '@/lib/types';

import { OrderStatusTrail, SpecialStatusBadge } from './OrderStatusTrail';
import { TrackingNumber } from './TrackingNumber';

export function TrackForm({ contactPhone }: { contactPhone: string }) {
  const [depositorName, setDepositorName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await findOrders(depositorName, phone);
      if (!result.ok) {
        setError(result.error);
        setOrders(null);
        return;
      }
      setOrders(result.orders);
    });
  }

  return (
    <div className="mt-6">
      <form onSubmit={handleSubmit} className="card space-y-4 px-4 py-4">
        <div>
          <label className="label" htmlFor="trackName">
            입금자명
          </label>
          <input
            id="trackName"
            className="field"
            value={depositorName}
            onChange={(e) => setDepositorName(e.target.value)}
            placeholder="주문할 때 적은 입금자명"
            autoComplete="name"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="trackPhone">
            연락처
          </label>
          <input
            id="trackPhone"
            className="field tnum"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="010-0000-0000"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </div>

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? '찾는 중…' : '주문 찾기'}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-berry-tint px-4 py-3 text-[0.9rem] font-semibold text-berry">
          {error}
        </p>
      )}

      {orders !== null && orders.length === 0 && (
        <div className="card mt-5 px-5 py-8 text-center">
          <p className="font-semibold">주문을 찾지 못했습니다</p>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-ink-soft">
            주문할 때 적은 입금자명과 연락처를 그대로 넣어야 찾을 수 있습니다.
            <br />
            계속 안 되면 {contactPhone} 으로 연락 주세요.
          </p>
        </div>
      )}

      {orders !== null && orders.length > 0 && (
        <div className="mt-6 space-y-4">
          <p className="px-1 text-[0.85rem] text-ink-soft">
            주문 <b className="tnum text-ink">{orders.length}</b>건을 찾았습니다.
          </p>
          {orders.map((order) => (
            <TrackedOrderCard key={order.orderNo} order={order} />
          ))}
          <Link href="/" className="btn btn-outline w-full">
            밤 더 고르기
          </Link>
        </div>
      )}
    </div>
  );
}

function TrackedOrderCard({ order }: { order: TrackedOrder }) {
  return (
    <article className="card px-4 py-4">
      <header className="flex items-baseline justify-between gap-3">
        <span className="tnum text-[0.82rem] text-ink-faint">주문번호 {order.orderNo}</span>
        <span className="text-[0.82rem] text-ink-faint">{formatDate(order.createdAt)}</span>
      </header>

      <div className="mt-4">
        <OrderStatusTrail
          createdAt={order.createdAt}
          paidAt={order.paidAt}
          shippedAt={order.shippedAt}
        />
      </div>

      <SpecialStatusBadge status={order.status} />

      {order.status === '입금대기' && (
        <div className="mt-3 rounded-xl bg-shell-tint px-3.5 py-2.5">
          <p className="text-[0.85rem] font-semibold text-shell">
            아직 입금이 확인되지 않았습니다.
          </p>
          <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-soft">
            {formatDateTime(paymentDueAt(order.createdAt))}까지 입금되지 않으면 주문이 자동으로
            취소됩니다.
          </p>
        </div>
      )}

      <ul className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[0.9rem]">
        {order.items.map((item) => (
          <li key={item.productId} className="flex justify-between text-ink-soft">
            <span>
              {item.name} <span className="tnum">×{item.qty}</span>
            </span>
            <span className="tnum">{formatKRW(item.subtotal)}</span>
          </li>
        ))}
        <li className="flex justify-between pt-1.5 font-semibold">
          <span>합계</span>
          <span className="tnum">{formatKRW(order.totalAmount)}</span>
        </li>
        {order.refundAmount > 0 && (
          <li className="flex justify-between font-semibold text-berry">
            <span>환불액</span>
            <span className="tnum">{formatKRW(order.refundAmount)}</span>
          </li>
        )}
      </ul>

      <dl className="mt-3.5 space-y-1.5 border-t border-line pt-3.5 text-[0.85rem]">
        <div className="flex gap-3">
          <dt className="w-16 shrink-0 text-ink-faint">받는 분</dt>
          <dd>{order.recipientName}</dd>
        </div>
        <div className="flex gap-3">
          <dt className="w-16 shrink-0 text-ink-faint">주소</dt>
          <dd className="leading-snug">{order.address}</dd>
        </div>
      </dl>

      {order.trackingNo && <TrackingNumber trackingNo={order.trackingNo} />}

      {order.memo && (
        <p className="mt-3 rounded-xl bg-paper px-3.5 py-2.5 text-[0.83rem] leading-relaxed text-ink-soft">
          {order.memo}
        </p>
      )}
    </article>
  );
}
