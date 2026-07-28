import { DailySalesChart, ProductSalesBars } from '@/components/admin/SalesCharts';
import { formatKRW } from '@/lib/format';
import { listOrders } from '@/lib/orders';
import { dailySales, productSales, sourceTotals, statusCounts, totals } from '@/lib/stats';

export const dynamic = 'force-dynamic';

/**
 * 판매 현황.
 *
 * 예전에는 "오늘 할 일" 맨 아래에 붙어 있었다. 그런데 그 화면은 **지금 손대야 하는 것**만
 * 보여야 하는 곳이고, 매출은 급할 때 볼 것이 아니라 가끔 궁금할 때 보는 것이다.
 * 아래로 스크롤해야 나오는 차트가 정작 급한 입금 알림을 밀어내고 있었다.
 */
export default async function AdminSalesPage() {
  const orders = await listOrders({ limit: 1000 });

  const summary = totals(orders);
  const statuses = statusCounts(orders);
  const bySource = sourceTotals(orders);

  return (
    <div>
      <h1 className="px-1 font-display text-[1.4rem]">판매 현황</h1>
      <p className="mt-1 px-1 text-[0.88rem] leading-snug text-ink-soft">
        매출은 <b>입금이 확인된 주문</b>만 셉니다. 입금대기·삭제·환불완료는 빠집니다.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <StatTile label="최근 7일" value={formatKRW(summary.last7Revenue)} />
        <StatTile label="전체 매출" value={formatKRW(summary.revenue)} />
      </div>

      {/* 전체 매출을 어디서 벌었나 — 사이트가 실제로 얼마나 일하고 있는지 */}
      {summary.revenue > 0 && (
        <div className="card mt-2 px-4 py-3.5">
          <dl className="space-y-2">
            <SourceRow
              swatch="bg-burr"
              label="인터넷 주문"
              amount={bySource.online}
              count={bySource.onlineCount}
              total={summary.revenue}
            />
            <SourceRow
              swatch="bg-shell"
              label="직접 넣은 주문"
              amount={bySource.direct}
              count={bySource.directCount}
              total={summary.revenue}
            />
          </dl>
        </div>
      )}

      {statuses.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1.5">
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
    </div>
  );
}

/** 차트의 범례와 같은 색을 써서, 위아래가 같은 이야기를 한다는 것이 보이게 한다. */
function SourceRow({
  swatch,
  label,
  amount,
  count,
  total,
}: {
  swatch: string;
  label: string;
  amount: number;
  count: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((amount / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-[3px] ${swatch}`} />
        <dt className="text-[0.88rem] font-semibold">{label}</dt>
        <dd className="tnum ml-auto text-[0.88rem]">
          <b>{formatKRW(amount)}</b>
          <span className="ml-1.5 text-ink-faint">{count}건</span>
        </dd>
      </div>
      <div className="mt-1 ml-5 h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${swatch}`} style={{ width: `${percent}%` }} />
      </div>
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
