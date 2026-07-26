/**
 * 입금 전에 반드시 읽어야 할 주의사항.
 *
 * 주문 완료 화면과 주문 조회 두 곳에 같은 내용이 나가므로 한 군데로 모았다.
 * 문구가 두 벌이면 한쪽만 고쳐져서 손님이 서로 다른 안내를 보게 된다.
 *
 * 자동 확인은 **입금자명과 금액이 정확히 맞을 때만** 된다.
 * 합산 입금이 확인 실패의 가장 흔한 원인이라 눈에 띄게 둔다.
 */
export function PaymentNotice({ depositorName }: { depositorName?: string }) {
  return (
    <div className="rounded-xl border-2 border-berry/35 bg-berry-tint px-3.5 py-3">
      <p className="text-[0.9rem] font-bold text-berry">입금시 주의사항</p>

      <div className="mt-2 space-y-2 text-[0.83rem] leading-relaxed text-ink-soft">
        {depositorName && (
          <p>
            입금자명이 <b className="text-ink">{depositorName}</b> 과(와) 다르면 입금 확인이
            늦어집니다. 이체할 때 이름을 꼭 확인해 주세요.
          </p>
        )}
        <p>
          각 주문의 금액을 따로 보내주셔야 합니다. 여러 건을 더해 한 번에 보내시면 입금 확인이
          되지 않습니다.
        </p>
        <p>
          각 주문을 합산하여 한번에 입금을 원하신다면 각 주문을 모두 취소하고 한개의 주문으로 입금
          하셔야 합니다.
        </p>
      </div>
    </div>
  );
}
