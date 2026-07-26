import Link from 'next/link';

import {
  DepositAlerts,
  type AlertDeposit,
  type CandidateOrder,
} from '@/components/admin/DepositAlerts';
import { DailySalesChart, ProductSalesBars } from '@/components/admin/SalesCharts';
import { ShipQueue, type ShipItem } from '@/components/admin/ShipQueue';
import { banksMatch, listUnresolvedDeposits } from '@/lib/deposits';
import { formatKRW, summarizeItems } from '@/lib/format';
import { expireStaleOrders, getOrders, listOrders } from '@/lib/orders';
import { isSoldOut, listProducts } from '@/lib/products';
import { getSettings } from '@/lib/settings';
import { dailySales, productSales, statusCounts, totals } from '@/lib/stats';
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
  const statuses = statusCounts(orders);

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

      {/* 4. 현황 */}
      <section>
        <h2 className="px-1 font-display text-[1.2rem]">판매 현황</h2>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <StatTile label="최근 7일" value={formatKRW(summary.last7Revenue)} />
          <StatTile label="전체 매출" value={formatKRW(summary.revenue)} />
          <StatTile label="입금된 주문" value={`${summary.orderCount}건`} />
        </div>

        {statuses.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {statuses.map((s) => (
              <li
                key={s.status}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-[0.82rem]"
              >
                {s.status} <b className="tnum">{s.count}</b>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 space-y-3">
          <DailySalesChart data={dailySales(orders, 7)} />
          <ProductSalesBars data={productSales(orders)} />
        </div>
      </section>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-3">
      <p className="text-[0.75rem] text-ink-soft">{label}</p>
      <p className="tnum mt-1 text-[0.98rem] leading-tight font-bold">{value}</p>
    </div>
  );
}
