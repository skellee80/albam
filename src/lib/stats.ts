import { kstDateKey, kstDayLabel } from './format';
import { ORDER_STATUSES, type Order, type OrderStatus } from './types';

/**
 * 관리자 화면 집계.
 *
 * 별도 집계 테이블을 두지 않고 주문 문서를 그때그때 합산한다(PRD: 간단하게).
 * 한 사람이 시즌에 파는 규모라 주문 수가 수천 건을 넘지 않고,
 * 집계 테이블을 두면 어긋났을 때 아버지가 손댈 방법이 없다.
 *
 * 순수 함수만 있어서 서버·클라이언트 어디서든 쓸 수 있다.
 */

/** 매출로 잡는 주문: 입금이 확인됐고, 취소·환불되지 않은 것 */
export function isRevenueOrder(order: Order): boolean {
  if (order.deleted) return false;
  if (order.paidAt === null) return false;
  return order.status !== '취소' && order.status !== '환불완료';
}

export type DailySales = { date: string; label: string; amount: number; count: number };

/** 최근 N일 매출 (KST 기준, 주문이 없는 날도 0으로 채워 넣는다) */
export function dailySales(orders: Order[], days = 7): DailySales[] {
  const buckets = new Map<string, DailySales>();
  const today = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    const at = today - i * 24 * 60 * 60 * 1000;
    const key = kstDateKey(at);
    buckets.set(key, { date: key, label: kstDayLabel(at), amount: 0, count: 0 });
  }

  for (const order of orders) {
    if (!isRevenueOrder(order)) continue;
    const key = kstDateKey(order.paidAt ?? order.createdAt);
    const bucket = buckets.get(key);
    if (!bucket) continue; // 기간 밖
    bucket.amount += order.totalAmount;
    bucket.count += 1;
  }

  return [...buckets.values()];
}

export type ProductSales = { name: string; qty: number; amount: number };

/** 상품별 판매량 (많이 팔린 순) */
export function productSales(orders: Order[]): ProductSales[] {
  const byName = new Map<string, ProductSales>();

  for (const order of orders) {
    if (!isRevenueOrder(order)) continue;
    for (const item of order.items) {
      const entry = byName.get(item.name) ?? { name: item.name, qty: 0, amount: 0 };
      entry.qty += item.qty;
      entry.amount += item.subtotal;
      byName.set(item.name, entry);
    }
  }

  return [...byName.values()].sort((a, b) => b.qty - a.qty);
}

export type StatusCount = { status: OrderStatus; count: number };

/** 상태별 건수 (0건인 상태는 빼서 화면을 어지럽히지 않는다) */
export function statusCounts(orders: Order[]): StatusCount[] {
  const counts = new Map<OrderStatus, number>();
  for (const order of orders) {
    if (order.deleted) continue;
    counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  }
  return ORDER_STATUSES.map((status) => ({ status, count: counts.get(status) ?? 0 })).filter(
    (s) => s.count > 0,
  );
}

export type Totals = { revenue: number; orderCount: number; last7Revenue: number };

export function totals(orders: Order[]): Totals {
  const revenueOrders = orders.filter(isRevenueOrder);
  const last7 = dailySales(orders, 7).reduce((sum, d) => sum + d.amount, 0);
  return {
    revenue: revenueOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    orderCount: revenueOrders.length,
    last7Revenue: last7,
  };
}
