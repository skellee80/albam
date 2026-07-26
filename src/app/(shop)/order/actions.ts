'use server';

import { createOrder, findMergeableOrders, mergeIntoOrder, type MergeableOrder } from '@/lib/orders';
import type { OrderItem } from '@/lib/types';

export type PlaceOrderResult =
  | {
      ok: true;
      orderNo: string;
      totalAmount: number;
      items: OrderItem[];
      paymentDueAt: number;
      merged: boolean;
    }
  | { ok: false; error: string };

/**
 * 아직 입금 안 된 같은 사람의 주문을 찾는다.
 *
 * 주문을 넣기 직전에 물어보려고 쓴다. 같은 사람이 두 건을 합쳐서 한 번에 송금하면
 * 입금액이 어느 주문과도 맞지 않아 자동 매칭이 실패하기 때문이다.
 */
export async function findPendingOrdersForDepositor(
  depositorName: string,
  depositorPhone: string,
): Promise<MergeableOrder[]> {
  try {
    return await findMergeableOrders(depositorName, depositorPhone);
  } catch (err) {
    console.error('[findPendingOrdersForDepositor]', err);
    return []; // 못 찾아도 주문 자체는 진행되어야 한다
  }
}

/**
 * 주문 접수.
 *
 * 받는 값에 가격이 없다는 점이 핵심이다. 상품과 수량만 받고,
 * 금액은 createOrder가 상품 문서를 다시 읽어 계산한다.
 * 브라우저에서 무엇을 조작하든 저장되는 금액은 바뀌지 않는다.
 */
export async function placeOrder(payload: {
  lines: { productId: string; qty: number }[];
  depositorName: string;
  depositorPhone: string;
  sameAsDepositor: boolean;
  recipient: { name: string; phone: string; address: string };
  /** 지정하면 새 주문을 만들지 않고 이 입금대기 주문에 합친다 */
  mergeIntoOrderId?: string | null;
}): Promise<PlaceOrderResult> {
  try {
    const result = payload.mergeIntoOrderId
      ? await mergeIntoOrder(payload.mergeIntoOrderId, payload.lines)
      : await createOrder({
          lines: payload.lines,
          depositorName: payload.depositorName,
          depositorPhone: payload.depositorPhone,
          sameAsDepositor: payload.sameAsDepositor,
          recipient: payload.recipient,
        });

    if (!result.ok) return { ok: false, error: result.error };

    return {
      ok: true,
      orderNo: result.orderNo,
      totalAmount: result.totalAmount,
      items: result.items,
      paymentDueAt: result.paymentDueAt,
      merged: result.merged,
    };
  } catch (err) {
    console.error('[placeOrder]', err);
    return { ok: false, error: '주문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}
