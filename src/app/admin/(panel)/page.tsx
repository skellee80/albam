import Link from 'next/link';

import {
  DepositAlerts,
  type AlertDeposit,
  type CandidateOrder,
} from '@/components/admin/DepositAlerts';
import { ShipQueue, type ShipItem } from '@/components/admin/ShipQueue';
import { banksMatch, listUnresolvedDeposits } from '@/lib/deposits';
import { formatKRW, summarizeItems } from '@/lib/format';
import { expireStaleOrders, getOrders, listOrders } from '@/lib/orders';
import { isSoldOut, listProducts } from '@/lib/products';
import { getSettings } from '@/lib/settings';
import { totals } from '@/lib/stats';
import type { Order } from '@/lib/types';

export const dynamic = 'force-dynamic';

function toCandidate(order: Order): CandidateOrder {
  return {
    id: order.id,
    orderNo: order.orderNo,
    depositorName: order.depositorName,
    depositorPhone: order.depositorPhone,
    recipientName: order.recipient.name,
    phone: order.recipient.phone,
    itemsSummary: summarizeItems(order.items),
    totalAmount: order.totalAmount,
  };
}

export default async function AdminDashboardPage() {
  // 아버지가 이 화면을 여는 순간의 목록이 정확해야 하므로 먼저 정리한다
  await expireStaleOrders();

  const [deposits, orders, products, settings] = await Promise.all([
    listUnresolvedDeposits(),
    listOrders({ limit: 1000 }),
    listProducts({ includeHidden: true }),
    getSettings(),
  ]);

  // 확인필요 입금의 후보 주문을 한 번에 읽어 온다
  const candidateIds = [...new Set(deposits.flatMap((d) => d.candidateOrderIds))];
  const candidateOrders = await getOrders(candidateIds);
  const candidateById = new Map(candidateOrders.map((o) => [o.id, o]));

  const alertDeposits: AlertDeposit[] = deposits.map((d) => ({
    id: d.id,
    amount: d.amount,
    depositorName: d.depositorName,
    bankName: d.bankName,
    status: d.status,
    receivedAt: d.receivedAt,
    rawText: d.rawText,
    candidates: d.candidateOrderIds
      .map((id) => candidateById.get(id))
      .filter((o): o is Order => Boolean(o) && !o!.deleted)
      .map(toCandidate),
    otherBank: !banksMatch(d.bankName, settings.bankName),
  }));

  const pendingOrders = orders.filter((o) => o.status === '입금대기').map(toCandidate);

  const shipQueue: ShipItem[] = orders
    .filter((o) => o.status === '발송대기')
    .map((o) => ({
      id: o.id,
      orderNo: o.orderNo,
      recipientName: o.recipient.name,
      phone: o.recipient.phone,
      address: o.recipient.address,
      itemsSummary: summarizeItems(o.items),
      totalAmount: o.totalAmount,
      paidAt: o.paidAt,
    }));

  const soldOut = products.filter((p) => !p.hidden && isSoldOut(p));

  const summary = totals(orders);

  return (
    <div className="space-y-6">
      {/* 1. 가장 급한 것 — 돈은 들어왔는데 주문이 안 움직이는 건 */}
      <DepositAlerts
        deposits={alertDeposits}
        pendingOrders={pendingOrders}
        accountBank={settings.bankName}
      />

      {/* 2. 매진 — 손님이 지금 주문할 수 없는 상품 */}
      {soldOut.length > 0 && (
        <section className="rounded-card border-2 border-amber/30 bg-amber-tint px-4 py-4">
          <h2 className="font-display text-[1.15rem] text-amber">매진된 상품 {soldOut.length}개</h2>
          <p className="mt-1 text-[0.85rem] leading-snug text-ink-soft">
            지금 손님이 주문할 수 없습니다. 물량이 있으면 재고를 채워 주세요.
          </p>
          <ul className="mt-2.5 space-y-1.5 text-[0.92rem]">
            {soldOut.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3">
                <span className="font-semibold">{p.name}</span>
                <span className="rounded-full bg-berry-tint px-2.5 py-1 text-[0.78rem] font-bold text-berry">
                  매진
                </span>
              </li>
            ))}
          </ul>
          <Link href="/admin/products" className="btn btn-outline mt-3 w-full min-h-11 text-[0.9rem]">
            재고 채우러 가기
          </Link>
        </section>
      )}

      {/* 3. 오늘 보낼 것 */}
      <ShipQueue orders={shipQueue} />

      {/*
        매출은 여기 두지 않는다. 이 화면은 "지금 손대야 하는 것"만 보는 곳이라,
        아래에 차트가 길게 붙으면 정작 급한 입금 알림이 화면 밖으로 밀려난다.
        궁금할 때 건너갈 수 있게 한 줄만 남긴다.
      */}
      <Link
        href="/admin/sales"
        className="flex items-center justify-between rounded-xl border border-line bg-surface px-4 py-3.5"
      >
        <span>
          <span className="block text-[0.92rem] font-semibold">판매 현황 보기</span>
          <span className="tnum mt-0.5 block text-[0.8rem] text-ink-soft">
            최근 7일 {formatKRW(summary.last7Revenue)}
          </span>
        </span>
        <span className="shrink-0 text-ink-faint">›</span>
      </Link>
    </div>
  );
}
