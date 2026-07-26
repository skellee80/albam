'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import { cancelOwnOrder, findOrders, type TrackedOrder } from '@/app/(shop)/track/actions';
import { formatDate, formatDateTime, formatKRW } from '@/lib/format';

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
    startTransition(refresh);
  }

  /** 취소 뒤에도 같은 조건으로 다시 읽어 화면을 최신으로 맞춘다 */
  async function refresh() {
    const result = await findOrders(depositorName, phone);
    if (!result.ok) {
      setError(result.error);
      setOrders(null);
      return;
    }
    setOrders(result.orders);
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
            <TrackedOrderCard
              key={order.id}
              order={order}
              contactPhone={contactPhone}
              lookupName={depositorName}
              lookupPhone={phone}
              onCancelled={refresh}
            />
          ))}
          <Link href="/" className="btn btn-outline w-full">
            밤 더 고르기
          </Link>
        </div>
      )}
    </div>
  );
}

function TrackedOrderCard({
  order,
  contactPhone,
  onCancelled,
  lookupName,
  lookupPhone,
}: {
  order: TrackedOrder;
  contactPhone: string;
  onCancelled: () => void;
  lookupName: string;
  lookupPhone: string;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, startCancel] = useTransition();

  function onCancelOrder() {
    setCancelError(null);
    startCancel(async () => {
      const result = await cancelOwnOrder(order.id, lookupName, lookupPhone);
      if (!result.ok) {
        setCancelError(result.error);
        setConfirmingCancel(false);
        return;
      }
      onCancelled();
    });
  }

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
        <div className="mt-3 rounded-xl bg-shell-tint px-3.5 py-3">
          <p className="text-[0.85rem] font-semibold text-shell">
            아직 입금이 확인되지 않았습니다.
          </p>
          <p className="mt-1.5 text-[0.82rem] leading-relaxed text-ink-soft">
            입금 후 3분 이내에 입금 완료가 자동 처리 됩니다.
            <br />
            입금 완료가 처리되지 않는 다면 연락주세요. <b className="tnum text-ink">{contactPhone}</b>
          </p>
          <p className="mt-2 text-[0.8rem] leading-relaxed text-ink-soft">
            {formatDateTime(order.paymentDueAt)}까지 입금되지 않으면 주문이 자동으로 취소됩니다.
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

      {/* 입금 전에는 손님이 스스로 취소할 수 있다. 입금 뒤에는 환불이 얽혀 전화로 받는다. */}
      {order.status === '입금대기' && (
        <div className="mt-3.5 border-t border-line pt-3">
          {cancelError && (
            <p role="alert" className="mb-2 text-[0.83rem] font-semibold text-berry">
              {cancelError}
            </p>
          )}
          {confirmingCancel ? (
            <div className="rounded-xl border border-berry/40 bg-berry-tint px-3.5 py-3">
              <p className="text-[0.87rem] font-bold text-berry">이 주문을 취소할까요?</p>
              <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">
                취소하면 되돌릴 수 없습니다. 다시 주문하시면 됩니다.
              </p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(false)}
                  disabled={cancelling}
                  className="btn btn-outline min-h-11 flex-1 text-[0.9rem]"
                >
                  아니요
                </button>
                <button
                  type="button"
                  onClick={onCancelOrder}
                  disabled={cancelling}
                  className="btn btn-danger min-h-11 flex-1 text-[0.9rem]"
                >
                  {cancelling ? '취소 중…' : '예, 취소합니다'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              className="w-full py-1.5 text-[0.85rem] text-ink-faint underline underline-offset-2"
            >
              주문 취소하기
            </button>
          )}
        </div>
      )}
    </article>
  );
}
