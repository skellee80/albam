import Link from 'next/link';

import { PrintButton } from '@/components/admin/PrintButton';
import { formatDateTime, formatKRW, summarizeItems } from '@/lib/format';
import { listOrders } from '@/lib/orders';

export const dynamic = 'force-dynamic';

/**
 * 오늘 부칠 주문의 주소를 종이로 뽑는 화면.
 *
 * 택배를 부칠 때는 폰을 보며 주소를 한 건씩 옮겨 적게 되는데, 그러다 한 줄을
 * 건너뛰면 엉뚱한 곳으로 간다. 종이에 한 번에 뽑아 두고 부친 것에 체크해 나가는 편이
 * 빠르고 틀리지 않는다.
 *
 * 인쇄용 스타일은 globals.css 의 @media print 에 있다 —
 * 관리자 머리띠와 버튼은 종이에서 빠지고 주소만 남는다.
 */
export default async function ShippingPrintPage() {
  const orders = await listOrders({ status: '발송대기', limit: 500 });
  const printedAt = Date.now();

  return (
    <div className="print-page">
      <div className="print-hide mb-4 flex items-center justify-between gap-3">
        <Link href="/admin" className="text-[0.85rem] text-ink-soft underline underline-offset-2">
          ‹ 오늘 할 일
        </Link>
        <PrintButton />
      </div>

      <header className="mb-4">
        <h1 className="font-display text-[1.4rem]">보낼 주문 {orders.length}건</h1>
        <p className="tnum mt-0.5 text-[0.82rem] text-ink-soft">{formatDateTime(printedAt)} 기준</p>
      </header>

      {orders.length === 0 ? (
        <p className="card px-5 py-10 text-center text-ink-soft">보낼 주문이 없습니다.</p>
      ) : (
        <ol className="space-y-2.5">
          {orders.map((order, index) => (
            <li key={order.id} className="print-row card px-4 py-3.5">
              <div className="flex items-baseline gap-2.5">
                {/* 부친 것에 표시해 나가라고 네모를 둔다 */}
                <span
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-[3px] border-2 border-ink-faint"
                />
                <span className="tnum text-[0.8rem] text-ink-faint">{index + 1}</span>
                <b className="text-[1.05rem]">{order.recipient.name}</b>
                <span className="tnum ml-auto text-[0.9rem]">{order.recipient.phone}</span>
              </div>

              <p className="mt-1.5 ml-[1.9rem] text-[0.95rem] leading-snug">
                {order.recipient.address || '(주소 없음 — 직접 판매)'}
              </p>

              <p className="mt-1 ml-[1.9rem] text-[0.85rem] text-ink-soft">
                {summarizeItems(order.items)}
                <span className="tnum ml-2">{formatKRW(order.totalAmount)}</span>
              </p>

              {order.memo && (
                <p className="mt-1 ml-[1.9rem] text-[0.82rem] text-shell">메모: {order.memo}</p>
              )}

              <p className="tnum mt-1 ml-[1.9rem] text-[0.72rem] text-ink-faint">
                {order.orderNo}
                {order.depositorName !== order.recipient.name
                  ? ` · 입금 ${order.depositorName}`
                  : ''}
              </p>
            </li>
          ))}
        </ol>
      )}

      <p className="print-hide mt-5 text-[0.83rem] leading-relaxed text-ink-soft">
        종이에 뽑아 부친 것에 표시해 나가세요. 발송완료 처리는 <b>오늘 할 일</b> 화면에서
        송장번호를 넣고 하시면 됩니다.
      </p>
    </div>
  );
}
