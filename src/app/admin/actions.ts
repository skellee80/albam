'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireAdmin, logout } from '@/lib/auth';
import {
  ignoreDeposit,
  previewDeposit,
  recordDeposit,
  resolveDeposit,
  type DepositPreview,
  type DepositResult,
} from '@/lib/deposits';
import {
  createOrder,
  markShipped,
  restoreOrder,
  softDeleteOrder,
  updateOrder,
  type OrderPatch,
  type StockShortage,
} from '@/lib/orders';
import {
  createProduct,
  deleteProduct,
  setGroupImage,
  updateProduct,
  type ProductInput,
} from '@/lib/products';
import { updateSettings } from '@/lib/settings';
import type { OrderItem, OrderStatus, Settings } from '@/lib/types';

/**
 * 관리자 서버 액션 모음.
 *
 * 모든 액션이 requireAdmin()으로 시작한다.
 * middleware가 /admin 경로를 막고 있지만, 서버 액션은 별도 엔드포인트로 호출될 수 있어
 * 액션 자체에서 한 번 더 확인해야 실제로 막힌다.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

async function run(fn: () => Promise<void>, paths: string[]): Promise<ActionResult> {
  try {
    await requireAdmin();
    await fn();
    for (const path of paths) revalidatePath(path);
    return { ok: true };
  } catch (err) {
    console.error('[admin action]', err);
    return { ok: false, error: err instanceof Error ? err.message : '처리하지 못했습니다.' };
  }
}

/* ── 입금 처리 ── */

export async function resolveDepositAction(
  depositId: string,
  orderId: string,
): Promise<ActionResult> {
  return run(() => resolveDeposit(depositId, orderId), ['/admin', '/admin/orders']);
}

export async function ignoreDepositAction(depositId: string): Promise<ActionResult> {
  return run(() => ignoreDeposit(depositId), ['/admin']);
}

/* ── 발송 ── */

export async function markShippedAction(
  orderId: string,
  trackingNo: string,
): Promise<ActionResult> {
  return run(() => markShipped(orderId, trackingNo), ['/admin', '/admin/orders']);
}

/* ── 직접 주문 추가 (전화·방문 판매) ── */

export type DirectOrderResult =
  | { ok: true; orderId: string; orderNo: string; totalAmount: number }
  | { ok: false; error: string; shortage?: StockShortage };

/**
 * 아버지가 전화·방문 판매를 손으로 넣는다.
 *
 * 손님 주문과 **같은 createOrder 를 쓴다.** 재고 차감과 가격 재계산이 갈라지면
 * 어느 한쪽만 어긋났을 때 찾을 방법이 없다. 여기서 넣은 것도 재고에서 빠진다.
 *
 * 재고가 모자라면 `shortage` 로 얼마나 모자란지 돌려준다 —
 * 화면이 "재고관리에서 먼저 채우세요"를 상품 이름과 함께 알려줄 수 있도록.
 */
export async function createDirectOrderAction(input: {
  depositorName: string;
  depositorPhone: string;
  sameAsDepositor: boolean;
  recipientName: string;
  recipientPhone: string;
  address: string;
  lines: { productId: string; qty: number; price?: number }[];
  paid: boolean;
  memo: string;
}): Promise<DirectOrderResult> {
  try {
    await requireAdmin();

    const depositorName = input.depositorName.trim();
    const depositorPhone = input.depositorPhone.trim();

    // 체크가 켜져 있으면 받는 분을 입금자로 채운다. 손님 주문서와 같은 규칙이다.
    const recipientName = input.sameAsDepositor ? depositorName : input.recipientName.trim();
    const recipientPhone = input.sameAsDepositor ? depositorPhone : input.recipientPhone.trim();

    const result = await createOrder({
      lines: input.lines,
      source: 'direct',
      paid: input.paid,
      depositorName,
      depositorPhone,
      sameAsDepositor: input.sameAsDepositor,
      recipient: {
        name: recipientName || depositorName,
        phone: recipientPhone,
        address: input.address.trim(),
      },
    });

    if (!result.ok) return { ok: false, error: result.error, shortage: result.shortage };

    // 어디서 온 주문인지 아버지가 나중에 알아볼 수 있게 메모를 남긴다
    const memo = input.memo.trim();
    if (memo) await updateOrder(result.orderId, { memo });

    for (const path of ['/admin', '/admin/orders', '/admin/sales', '/']) revalidatePath(path);

    return {
      ok: true,
      orderId: result.orderId,
      orderNo: result.orderNo,
      totalAmount: result.totalAmount,
    };
  } catch (err) {
    console.error('[createDirectOrderAction]', err);
    return { ok: false, error: err instanceof Error ? err.message : '넣지 못했습니다.' };
  }
}

/* ── 주문 수정 ── */

export async function updateOrderAction(
  orderId: string,
  patch: {
    recipient?: { name: string; phone: string; address: string };
    depositorName?: string;
    depositorPhone?: string;
    items?: OrderItem[];
    status?: OrderStatus;
    trackingNo?: string;
    memo?: string;
    refundAmount?: number;
  },
): Promise<ActionResult> {
  return run(() => updateOrder(orderId, patch as OrderPatch), [
    '/admin',
    '/admin/orders',
    `/admin/orders/${orderId}`,
  ]);
}

export async function deleteOrderAction(orderId: string): Promise<ActionResult> {
  return run(() => softDeleteOrder(orderId), ['/admin', '/admin/orders']);
}

export async function restoreOrderAction(orderId: string): Promise<ActionResult> {
  return run(() => restoreOrder(orderId), ['/admin', '/admin/orders']);
}

/* ── 상품 ── */

export async function saveProductAction(
  productId: string | null,
  input: ProductInput,
): Promise<ActionResult> {
  return run(async () => {
    if (productId) await updateProduct(productId, input);
    else await createProduct(input);
  }, ['/admin', '/admin/products', '/']);
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  return run(() => deleteProduct(productId), ['/admin', '/admin/products', '/']);
}

/** 그룹(품종) 사진을 그 그룹의 상품 전체에 한꺼번에 건다. */
export async function setGroupImageAction(
  group: string,
  imageUrl: string,
): Promise<ActionResult> {
  return run(async () => {
    const changed = await setGroupImage(group.trim(), imageUrl.trim());
    if (changed === 0) throw new Error('그 그룹의 상품을 찾지 못했습니다.');
  }, ['/admin', '/admin/products', '/']);
}

export async function restockProductAction(
  productId: string,
  stock: number,
): Promise<ActionResult> {
  return run(() => updateProduct(productId, { stock }), ['/admin', '/admin/products', '/']);
}

/* ── 설정 ── */

export async function updateSettingsAction(settings: Settings): Promise<ActionResult> {
  return run(() => updateSettings(settings), ['/admin', '/admin/settings', '/order']);
}

/* ── 입금 문자 테스트 ── */

/** 아무것도 바꾸지 않고 판정 결과만 본다 */
export async function previewDepositAction(input: {
  amount: string;
  depositorName: string;
  bankName: string;
}): Promise<{ ok: true; preview: DepositPreview } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const preview = await previewDeposit({
      // MacroDroid가 "50,000원" 같은 형태로 보내는 것과 똑같이 숫자만 뽑는다
      amount: Number(String(input.amount).replace(/[^\d]/g, '')),
      depositorName: input.depositorName,
      bankName: input.bankName,
    });
    return { ok: true, preview };
  } catch (err) {
    console.error('[previewDepositAction]', err);
    return { ok: false, error: err instanceof Error ? err.message : '확인하지 못했습니다.' };
  }
}

/** 실제 입금이 온 것처럼 처리한다 (주문 상태가 바뀐다) */
export async function sendTestDepositAction(input: {
  amount: string;
  depositorName: string;
  bankName: string;
}): Promise<{ ok: true; result: DepositResult } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const result = await recordDeposit({
      amount: Number(String(input.amount).replace(/[^\d]/g, '')),
      depositorName: input.depositorName,
      bankName: input.bankName,
    });
    revalidatePath('/admin');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/test');
    return { ok: true, result };
  } catch (err) {
    console.error('[sendTestDepositAction]', err);
    return { ok: false, error: err instanceof Error ? err.message : '처리하지 못했습니다.' };
  }
}

/* ── 로그아웃 ── */

export async function logoutAction(): Promise<void> {
  await logout();
  redirect('/admin/login');
}
