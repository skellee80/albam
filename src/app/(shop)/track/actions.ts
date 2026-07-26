'use server';

import { lookupOrders } from '@/lib/orders';
import type { OrderItem, OrderStatus } from '@/lib/types';

/** 배송조회 화면에 내보내는 필드만 추린 모양. 주문 문서를 통째로 넘기지 않는다. */
export type TrackedOrder = {
  orderNo: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  trackingNo: string;
  recipientName: string;
  address: string;
  memo: string;
  refundAmount: number;
  createdAt: number;
  paidAt: number | null;
  shippedAt: number | null;
};

export type LookupResult =
  | { ok: true; orders: TrackedOrder[] }
  | { ok: false; error: string };

/**
 * 로그인 없는 배송조회.
 *
 * 클라이언트가 Firestore를 직접 쿼리하지 않는다(PRD). 서버가 입금자명과 전화번호가
 * 둘 다 정확히 일치하는 건만 골라서, 화면에 필요한 필드만 돌려준다.
 */
export async function findOrders(depositorName: string, phone: string): Promise<LookupResult> {
  if (!depositorName.trim() || !phone.trim()) {
    return { ok: false, error: '입금자명과 연락처를 모두 입력해 주세요.' };
  }

  try {
    const orders = await lookupOrders(depositorName, phone);
    return {
      ok: true,
      orders: orders.map((o) => ({
        orderNo: o.orderNo,
        status: o.status,
        items: o.items,
        totalAmount: o.totalAmount,
        trackingNo: o.trackingNo,
        recipientName: o.recipient.name,
        address: o.recipient.address,
        memo: o.memo,
        refundAmount: o.refundAmount,
        createdAt: o.createdAt,
        paidAt: o.paidAt,
        shippedAt: o.shippedAt,
      })),
    };
  } catch (err) {
    console.error('[findOrders]', err);
    return { ok: false, error: '조회에 실패했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}
