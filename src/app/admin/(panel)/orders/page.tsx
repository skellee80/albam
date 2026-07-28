import Link from 'next/link';

import { OrderList, type OrderRow } from '@/components/admin/OrderList';
import { summarizeItems } from '@/lib/format';
import { listOrders } from '@/lib/orders';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const DELETED_FILTER = '삭제됨';

function isOrderStatus(value: string | undefined): value is OrderStatus {
  return !!value && (ORDER_STATUSES as readonly string[]).includes(value);
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const showDeleted = status === DELETED_FILTER;

  const orders = await listOrders({
    status: isOrderStatus(status) ? status : undefined,
    limit: 500,
    includeDeleted: showDeleted,
  });

  const rows: OrderRow[] = (showDeleted ? orders.filter((o) => o.deleted) : orders).map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    recipientName: o.recipient.name,
    depositorName: o.depositorName,
    phone: o.recipient.phone,
    itemsSummary: summarizeItems(o.items),
    totalAmount: o.totalAmount,
    status: o.status,
    source: o.source,
    trackingNo: o.trackingNo,
    deleted: o.deleted,
    createdAt: o.createdAt,
  }));

  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-1">
        <h1 className="font-display text-[1.4rem]">주문</h1>
        {/* 전화·방문 판매도 재고에서 빠져야 하므로 여기서 넣는다 */}
        <Link href="/admin/orders/new" className="btn btn-primary min-h-11 shrink-0 px-4 text-[0.88rem]">
          직접 넣기
        </Link>
      </div>

      <nav className="mt-3 -mx-4 overflow-x-auto px-4" aria-label="상태로 거르기">
        <div className="flex gap-1.5">
          <FilterChip label="전체" href="/admin/orders" active={!status} />
          {ORDER_STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={s}
              href={`/admin/orders?status=${encodeURIComponent(s)}`}
              active={status === s}
            />
          ))}
          <FilterChip
            label={DELETED_FILTER}
            href={`/admin/orders?status=${encodeURIComponent(DELETED_FILTER)}`}
            active={showDeleted}
          />
        </div>
      </nav>

      <OrderList orders={rows} />
    </div>
  );
}

function FilterChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`shrink-0 rounded-full px-3.5 py-2 text-[0.85rem] font-semibold ${
        active ? 'bg-shell text-white' : 'border border-line bg-surface text-ink-soft'
      }`}
    >
      {label}
    </Link>
  );
}
