'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { formatKRW, formatShortDateTime, normalizeName, normalizePhone } from '@/lib/format';
import { orderStatusTone } from '@/lib/status-tone';
import type { OrderSource, OrderStatus } from '@/lib/types';

export type OrderRow = {
  id: string;
  orderNo: string;
  recipientName: string;
  depositorName: string;
  phone: string;
  itemsSummary: string;
  totalAmount: number;
  status: OrderStatus;
  source: OrderSource;
  trackingNo: string;
  deleted: boolean;
  createdAt: number;
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
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-bold ${orderStatusTone(
                      order.status,
                      order.deleted,
                    )}`}
                  >
                    {order.deleted ? '삭제됨' : order.status}
                  </span>
                </div>

                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[0.88rem] text-burr-deep">{order.itemsSummary}</span>
                  <span className="tnum shrink-0 font-semibold">{formatKRW(order.totalAmount)}</span>
                </div>

                <p className="mt-1.5 text-[0.72rem] text-ink-faint">
                  {/*
                    사이트로 들어온 것과 아버지가 손으로 넣은 것을 한눈에 가른다.
                    한쪽에만 표를 달면 표가 없는 줄이 "아직 분류가 안 된 것"처럼 보인다.
                    둘 다 달아야 표가 없는 상태가 없어진다.
                  */}
                  {order.source === 'direct' ? (
                    <span className="mr-1.5 rounded-full bg-shell-tint px-1.5 py-0.5 font-bold text-shell">
                      직접
                    </span>
                  ) : (
                    <span className="mr-1.5 rounded-full bg-burr-tint px-1.5 py-0.5 font-bold text-burr-deep">
                      인터넷
                    </span>
                  )}
                  <span className="tnum">
                    {order.orderNo} · {formatShortDateTime(order.createdAt)}
                    {order.trackingNo ? ` · 송장 ${order.trackingNo}` : ''}
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
