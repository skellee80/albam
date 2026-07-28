'use client';

/**
 * 수량 조절 — 빼기 / 숫자 / 더하기.
 *
 * 아버지가 폰에서 쓰는 화면이라 숫자 칸을 눌러 자판을 띄우고 지우고 다시 치는 것보다
 * 버튼을 누르는 편이 빠르고 틀리지 않는다. 손님 상품 목록과 같은 모양이라
 * 두 화면에서 같은 동작을 배우면 된다.
 *
 * 숫자 칸은 그대로 둔다 — 30개처럼 큰 수를 넣을 때는 눌러서 치는 게 낫다.
 */
export function QtyStepper({
  value,
  onChange,
  max,
  min = 0,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  /** 넘으면 더하기가 막힌다. 재고를 넘겨도 서버가 막지만 여기서 먼저 알려준다. */
  max?: number;
  min?: number;
  label: string;
}) {
  const ceiling = max ?? Number.MAX_SAFE_INTEGER;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-full border border-line bg-surface">
        <Step
          label={`${label} 줄이기`}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
        >
          −
        </Step>
        <input
          className="tnum w-14 border-0 bg-transparent py-2 text-center text-[1rem] font-semibold outline-none"
          value={value}
          onChange={(e) => {
            const next = Number(e.target.value.replace(/[^\d]/g, ''));
            onChange(Number.isFinite(next) ? next : min);
          }}
          inputMode="numeric"
          aria-label={label}
        />
        <Step
          label={`${label} 늘리기`}
          onClick={() => onChange(Math.min(ceiling, value + 1))}
          disabled={value >= ceiling}
        >
          +
        </Step>
      </div>

      {max !== undefined && (
        <span className="tnum text-[0.8rem] text-ink-faint">재고 {max}</span>
      )}
    </div>
  );
}

function Step({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-semibold text-ink-soft disabled:opacity-30"
    >
      {children}
    </button>
  );
}
