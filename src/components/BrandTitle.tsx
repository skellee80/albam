'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { BRAND } from '@/lib/brand';

/** 관리자 화면으로 들어가려면 타이틀을 이만큼 연속으로 눌러야 한다. */
const TAPS_TO_ADMIN = 10;

/** 이 시간 동안 안 누르면 처음부터 다시 센다. */
const RESET_AFTER_MS = 1500;

/**
 * 가게 이름.
 *
 * 손님에게는 그냥 제목이지만, **연속으로 열 번 누르면 관리자 화면으로 넘어간다.**
 * 아버지가 주소창에 /admin 을 칠 필요 없이 폰에서 바로 들어갈 수 있게 하려는 것이다.
 *
 * 숨은 동작이므로 **아무 표시도 하지 않는다.** 세는 값을 state로 두면 누를 때마다
 * 다시 그려져 흔적이 남을 수 있어 ref로만 센다(어차피 화면에 쓰이지 않는다).
 *
 * 제목을 링크로 두지 않는 이유: 첫 번째 탭에서 홈으로 이동해 버리면 셀 수가 없다.
 * 홈으로 가는 길은 아래 "상품" 메뉴가 맡는다.
 */
export function BrandTitle() {
  const router = useRouter();
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const handleTap = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);

    taps.current += 1;

    if (taps.current >= TAPS_TO_ADMIN) {
      taps.current = 0;
      router.push('/admin');
      return;
    }

    timer.current = setTimeout(() => {
      taps.current = 0;
    }, RESET_AFTER_MS);
  }, [router]);

  return (
    <button
      type="button"
      onClick={handleTap}
      // 손님에게는 그냥 제목이라 버튼처럼 보이지 않게 둔다
      className="block cursor-default text-center select-none"
    >
      <span className="block font-display text-[1.7rem] leading-tight tracking-tight">
        {BRAND.full}
      </span>
    </button>
  );
}
