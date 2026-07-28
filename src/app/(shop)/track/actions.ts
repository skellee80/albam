'use server';

import { lookupOrders, updateOrder } from '@/lib/orders';
import type { OrderItem, OrderStatus } from '@/lib/types';

/** 주문 조회 화면에 내보내는 필드만 추린 모양. 주문 문서를 통째로 넘기지 않는다. */
export type TrackedOrder = {
  /** 취소 요청에 쓰인다. 소유 확인은 서버에서 다시 한다. */
  id: string;
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
  paymentDueAt: number;
  paidAt: number | null;
  shippedAt: number | null;
};

export type LookupResult =
  | { ok: true; orders: TrackedOrder[] }
  | { ok: false; error: string };

/**
 * 손님이 자기 주문을 스스로 취소한다.
 *
 * 주문 ID만으로 취소를 허용하면 남의 주문 번호를 아는 사람이 취소할 수 있다.
 * 조회할 때와 똑같이 **입금자명 + 연락처가 맞는 주문인지 확인한 뒤**에만 취소한다.
 *
 * 아직 입금하지 않은 주문만 취소할 수 있다. 입금이 끝난 뒤에는 환불이 얽히므로
 * 전화로 처리하는 편이 낫다.
 */
export async function cancelOwnOrder(
  orderId: string,
  depositorName: string,
  phone: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const mine = await lookupOrders(depositorName, phone);
    const target = mine.find((o) => o.id === orderId);

    if (!target) {
      return { ok: false, error: '주문을 찾을 수 없습니다. 다시 조회해 주세요.' };
    }
    if (target.status !== '입금대기') {
      return {
        ok: false,
        error: '이미 입금이 확인된 주문입니다. 취소하시려면 전화로 연락해 주세요.',
      };
    }

    // 상태가 아니라 삭제로 다룬다. 재고가 돌아가고 손님 조회에서 사라지는 것은
    // 예전 '취소' 상태와 똑같고, 아버지가 관리자에서 되살릴 수도 있다.
    await updateOrder(orderId, { deleted: true });
    return { ok: true };
  } catch (err) {
    console.error('[cancelOwnOrder]', err);
    return { ok: false, error: '취소하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}

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
        id: o.id,
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
        paymentDueAt: o.paymentDueAt,
        paidAt: o.paidAt,
        shippedAt: o.shippedAt,
      })),
    };
  } catch (err) {
    console.error('[findOrders]', err);
    return { ok: false, error: '조회에 실패했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}
