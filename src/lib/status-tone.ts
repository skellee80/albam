import type { OrderStatus } from './types';

/**
 * 주문 상태별 색.
 *
 * 아버지가 목록을 훑으며 **읽지 않고 색만 보고** 구분할 수 있어야 한다.
 * 그래서 두 가지를 같이 쓴다.
 *
 *  - **색상(hue)** — 주황 / 초록 / 청회색 / 분홍처럼 아예 다른 계열
 *  - **채움(weight)** — 지금 손대야 하는 것은 진하게 채우고, 끝난 것은 연하게
 *
 * 예전에는 입금대기가 연한 베이지, 발송완료가 연한 회색이라 둘 다 흐린 따뜻한 색이어서
 * 나란히 놓으면 구분이 안 됐다. 이 사이트 색이 전부 따뜻한 계열이라 그 안에서
 * 회색을 고르면 늘 이렇게 된다. 그래서 발송완료에만 차가운 색(slate)을 따로 뒀다.
 */
export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  // 손대야 하는 것 — 진하게 채운다
  입금대기: 'bg-amber text-white',
  발송대기: 'bg-burr text-white',

  // 끝난 것 — 연하게, 테두리로 형태만
  발송완료: 'bg-slate-tint text-slate ring-1 ring-slate/25',
  환불완료: 'bg-berry-tint text-berry ring-1 ring-berry/30',
  교환완료: 'bg-shell-tint text-shell ring-1 ring-shell/25',
};

/** 물러난 주문(기한 지남 · 손님이 무름 · 아버지가 지움). 상태와 무관하게 이 색을 쓴다. */
export const DELETED_TONE = 'bg-line text-ink-faint ring-1 ring-ink-faint/20';

export function orderStatusTone(status: OrderStatus, deleted = false): string {
  if (deleted) return DELETED_TONE;
  return ORDER_STATUS_TONE[status] ?? DELETED_TONE;
}
