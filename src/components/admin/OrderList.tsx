'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { formatKRW, formatShortDateTime, normalizeName, normalizePhone } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';

export type OrderRow = {
  id: string;
  orderNo: string;
  recipientName: string;
  depositorName: string;
  phone: string;
  itemsSummary: string;
  totalAmount: number;
  status: OrderStatus;
  trackingNo: string;
  deleted: boolean;
  createdAt: number;
};

const STATUS_TONE: Record<string, string> = {
  입금대기: 'bg-shell-tint text-shell',
  발송대기: 'bg-burr-tint text-burr-deep',
  발송완료: 'bg-line text-ink-soft',
  취소: 'bg-berry-tint text-berry',
  환불완료: 'bg-berry-tint text-berry',
  교환완료: 'bg-line text-ink-soft',
};

export function OrderList({ orders }: { orders: OrderRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim();
    if (!term) return orders;

    // 이름은 공백을 무시하고, 전화번호는 숫자만 비교한다 (하이픈을 넣든 말든 찾히도록)
    const nameTerm = normalizeName(term);
    const digitTerm = normalizePhone(term);

    return orders.filter((o) => {
      if (nameTerm && normalizeName(o.recipientName).includes(nameTerm)) return true;
      if (nameTerm && normalizeName(o.depositorName).includes(nameTerm)) return true;
      if (digitTerm && normalizePhone(o.phone).includes(digitTerm)) return true;
      if (digitTerm && o.orderNo.replace(/\D/g, '').includes(digitTerm)) return true;
      if (digitTerm && o.trackingNo.replace(/\D/g, '').includes(digitTerm)) return true;
      return false;
    });
  }, [orders, query]);

  return (
    <div className="mt-3">
      <input
        className="field"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="이름 · 전화번호 · 주문번호 · 송장번호로 찾기"
        aria-label="주문 찾기"
      />

      <p className="mt-2 px-1 text-[0.82rem] text-ink-soft">
        {query.trim() ? `${filtered.length}건 찾음` : `${orders.length}건`}
      </p>

      {filtered.length === 0 ? (
        <p className="card mt-2 px-5 py-10 text-center text-ink-soft">해당하는 주문이 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {filtered.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/orders/${order.id}`}
                className={`card block px-4 py-3.5 transition-colors hover:border-burr ${
                  order.deleted ? 'opacity-55' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[1.05rem] font-bold">
                      {order.recipientName}
                      {order.depositorName !== order.recipientName && (
                        <span className="ml-1.5 text-[0.82rem] font-normal text-ink-soft">
                          입금 {order.depositorName}
                        </span>
                      )}
                    </p>
                    <p className="tnum mt-0.5 text-[0.85rem] text-ink-soft">{order.phone}</p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-bold ${
                      order.deleted ? 'bg-line text-ink-soft' : (STATUS_TONE[order.status] ?? 'bg-line text-ink-soft')
                    }`}
                  >
                    {order.deleted ? '삭제됨' : order.status}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[0.88rem] text-burr-deep">{order.itemsSummary}</span>
                  <span className="tnum shrink-0 font-semibold">{formatKRW(order.totalAmount)}</span>
                </div>

                <p className="tnum mt-1.5 text-[0.72rem] text-ink-faint">
                  {order.orderNo} · {formatShortDateTime(order.createdAt)}
                  {order.trackingNo ? ` · 송장 ${order.trackingNo}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
