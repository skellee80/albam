'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BRAND } from '@/lib/brand';

/** 관리자 화면으로 들어가려면 타이틀을 이만큼 연속으로 눌러야 한다. */
const TAPS_TO_ADMIN = 10;

/** 이 시간 동안 안 누르면 처음부터 다시 센다. */
const RESET_AFTER_MS = 1500;

/** 이 횟수부터는 몇 번 남았는지 살짝 알려준다. */
const HINT_FROM = 5;

/**
 * 가게 이름.
 *
 * 손님에게는 그냥 제목이지만, **연속으로 열 번 누르면 관리자 화면으로 넘어간다.**
 * 아버지가 주소창에 /admin 을 칠 필요 없이 폰에서 바로 들어갈 수 있게 하려는 것이고,
 * 손님이 우연히 발견할 일은 없도록 열 번으로 잡았다.
 *
 * 제목을 링크로 두지 않는 이유: 첫 번째 탭에서 홈으로 이동해 버리면 셀 수가 없다.
 * 홈으로 가는 길은 아래 "상품" 메뉴가 맡는다.
 */
export function BrandTitle() {
  const router = useRouter();
  const [taps, setTaps] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleTap = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);

    setTaps((prev) => {
      const next = prev + 1;
      if (next >= TAPS_TO_ADMIN) {
        router.push('/admin');
        return 0;
      }
      timer.current = setTimeout(() => setTaps(0), RESET_AFTER_MS);
      return next;
    });
  }, [router]);

  const remaining = TAPS_TO_ADMIN - taps;

  return (
    <button
      type="button"
      onClick={handleTap}
      // 손님에게는 그냥 제목이라 버튼처럼 보이지 않게 둔다
      className="block cursor-default text-center select-none"
      aria-label={BRAND.full}
    >
      <span className="block font-display text-[1.7rem] leading-tight tracking-tight">
        {BRAND.full}
      </span>
      <span
        aria-hidden
        className={`mt-0.5 block text-[0.7rem] text-white/70 transition-opacity ${
          taps >= HINT_FROM ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {remaining}
      </span>
    </button>
  );
}
