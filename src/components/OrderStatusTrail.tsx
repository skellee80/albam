import { formatShortDateTime } from '@/lib/format';
import type { OrderStatus } from '@/lib/types';

/**
 * 진행 상태 3단계.
 *
 * 단계는 실제로 기록된 시각(주문/입금확인/발송)에서 유도한다.
 * 상태 문자열을 눈으로 매핑하지 않으므로 관리자가 상태를 되돌려도 표시가 어긋나지 않는다.
 */
export function OrderStatusTrail({
  createdAt,
  paidAt,
  shippedAt,
}: {
  createdAt: number;
  paidAt: number | null;
  shippedAt: number | null;
}) {
  const steps = [
    { label: '주문 접수', at: createdAt },
    { label: '입금 확인', at: paidAt },
    { label: '발송 완료', at: shippedAt },
  ];

  // 마지막으로 완료된 단계가 현재 위치
  const lastDone = steps.reduce((acc, s, i) => (s.at ? i : acc), 0);

  return (
    <ol className="flex items-start gap-1">
      {steps.map((step, i) => {
        const done = step.at !== null && step.at !== undefined;
        const current = done && i === lastDone;
        return (
          <li key={step.label} className="flex-1">
            <div className="flex items-center">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.7rem] font-bold ${
                  done ? 'bg-burr text-white' : 'bg-line text-ink-faint'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              {i < steps.length - 1 && (
                <span className={`h-[3px] flex-1 rounded-full ${steps[i + 1].at ? 'bg-burr' : 'bg-line'}`} />
              )}
            </div>
            <p
              className={`mt-1.5 text-[0.78rem] leading-tight ${
                current ? 'font-bold text-burr-deep' : done ? 'text-ink-soft' : 'text-ink-faint'
              }`}
            >
              {step.label}
            </p>
            {step.at ? (
              <p className="tnum text-[0.68rem] text-ink-faint">{formatShortDateTime(step.at)}</p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** 환불·교환처럼 3단계로 표현되지 않는 상태는 별도 배지로 분명히 알린다. */
const SPECIAL_STATUS: Partial<Record<OrderStatus, { text: string; tone: 'berry' | 'amber' }>> = {
  환불요청: { text: '환불 요청을 접수했습니다', tone: 'amber' },
  환불완료: { text: '환불이 완료되었습니다', tone: 'berry' },
  교환요청: { text: '교환 요청을 접수했습니다', tone: 'amber' },
  교환완료: { text: '교환이 완료되었습니다', tone: 'berry' },
};

export function SpecialStatusBadge({ status }: { status: OrderStatus }) {
  const special = SPECIAL_STATUS[status];
  if (!special) return null;

  const tone =
    special.tone === 'berry' ? 'bg-berry-tint text-berry' : 'bg-amber-tint text-amber';

  return (
    <p className={`mt-3 rounded-xl px-3.5 py-2.5 text-[0.85rem] font-semibold ${tone}`}>
      {special.text}
    </p>
  );
}
