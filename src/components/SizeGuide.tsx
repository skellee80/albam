'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import { sizeToneOf } from '@/lib/size-tone';
import { SIZE_GUIDE } from '@/lib/types';

/** 관리자 화면으로 들어가려면 이 카드를 이만큼 연속으로 눌러야 한다. */
const TAPS_TO_ADMIN = 10;

/**
 * 마지막으로 누른 뒤 이만큼 지나면 세던 횟수를 버리고 처음부터 다시 센다.
 *
 *  - 너무 짧으면: 천천히 누르는 아버지가 열 번을 못 채워 영영 못 들어간다.
 *  - 너무 길면: 손님이 며칠에 걸쳐 무심코 누른 것이 쌓여 관리자 화면이 열린다.
 */
const RESET_AFTER_MS = 3000;

/**
 * 크기 안내 카드.
 *
 * 중·대·특이 모든 묶음에서 똑같이 반복되므로 상품마다 붙이지 않고 여기서 한 번만 한다.
 *
 * **이 카드가 관리자 화면으로 들어가는 숨은 문이다.** 연속으로 열 번 누르면 넘어간다.
 * 아버지가 주소창에 /admin 을 칠 필요 없이 폰에서 바로 들어갈 수 있게 하려는 것이다.
 *
 * 가게 이름(타이틀)에 걸어 두었던 것을 여기로 옮겼다. 타이틀은 화면 맨 위에 있어
 * 스크롤을 올리다 손가락이 스치는 일이 잦았다. 이 카드는 목록 사이에 있어 무심코
 * 여러 번 눌릴 일이 적다.
 *
 * 숨은 동작이므로 **아무 표시도 하지 않는다.** 세는 값을 state로 두면 누를 때마다
 * 다시 그려져 흔적이 남을 수 있어 ref로만 센다.
 */
export function SizeGuide() {
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
    /*
      카드 전체가 누름 영역이다. 손님에게는 그냥 읽을거리라 버튼처럼 보이지 않게 둔다.
      div + onClick 이라 키보드로는 눌리지 않는데, 숨은 문이라 오히려 그게 맞다.
    */
    <section
      onClick={handleTap}
      className="mt-5 cursor-default overflow-hidden rounded-card border border-line bg-surface select-none"
    >
      <h2 className="bg-flesh/45 px-4 py-2.5 text-center font-display text-[1rem] text-shell">
        밤 사이즈
      </h2>
      <dl className="divide-y divide-line/70">
        {SIZE_GUIDE.map((guide) => {
          const tone = sizeToneOf(guide.size);
          return (
            <div key={guide.size} className="flex items-center gap-2.5 px-4 py-2.5">
              <dt
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.85rem] font-bold ${tone.chip}`}
              >
                {guide.size}
              </dt>
              {/* 이름표와 설명을 같은 색으로 두고 굵기로만 나눈다 — 한 줄이 한 등급이라는 게 보인다 */}
              <dd className={`min-w-0 flex-1 text-[0.83rem] leading-snug ${tone.label}`}>
                <b>{guide.tag}</b>
                <span aria-hidden="true" className="px-1 opacity-70">
                  →
                </span>
                <span className="font-normal">{guide.note}</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
