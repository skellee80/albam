'use server';

import { createOrder } from '@/lib/orders';
import type { OrderItem } from '@/lib/types';

export type PlaceOrderResult =
  | { ok: true; orderNo: string; totalAmount: number; items: OrderItem[] }
  | { ok: false; error: string };

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
}): Promise<PlaceOrderResult> {
  try {
    const result = await createOrder({
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
    };
  } catch (err) {
    console.error('[placeOrder]', err);
    return { ok: false, error: '주문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' };
  }
}
