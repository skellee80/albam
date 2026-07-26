'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { requireAdmin, logout } from '@/lib/auth';
import { ignoreDeposit, resolveDeposit } from '@/lib/deposits';
import {
  markShipped,
  restoreOrder,
  softDeleteOrder,
  updateOrder,
  type OrderPatch,
} from '@/lib/orders';
import { createProduct, deleteProduct, updateProduct, type ProductInput } from '@/lib/products';
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

export async function setOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<ActionResult> {
  return run(() => updateOrder(orderId, { status }), [
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

/* ── 로그아웃 ── */

export async function logoutAction(): Promise<void> {
  await logout();
  redirect('/admin/login');
}
