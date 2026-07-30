import { SIZE_ALIASES, SIZE_GUIDE, type Size } from './types';

/**
 * 크기(중·대·특)의 색.
 *
 * **실속 → 선물 → 최상급** 으로 올라가는 등급을 색으로도 알려준다.
 * 초록(가벼움) → 갈색(중간) → 주황(무거움) 순으로 진해져서, 글자를 읽기 전에도
 * 어느 쪽이 큰 것인지 눈에 들어온다.
 *
 * 안내 카드와 상품 줄이 **같은 색을 써야** 한다. 위에서 "특은 주황"이라고 배운 손님이
 * 아래 목록에서 다른 색을 보면 둘을 잇지 못한다. 그래서 색을 여기 한 곳에 둔다.
 */
export type SizeTone = {
  /** 채운 알약 — 상품 줄과 안내 카드의 동그라미에 쓴다 */
  chip: string;
  /** 글자색 — 안내 카드의 설명 줄에 쓴다 */
  label: string;
};

const TONES: Record<'burr' | 'shell' | 'amber', SizeTone> = {
  burr: { chip: 'bg-burr text-white', label: 'text-burr-deep' },
  shell: { chip: 'bg-shell text-white', label: 'text-shell' },
  amber: { chip: 'bg-amber text-white', label: 'text-amber' },
};

/** 크기 목록에 없는 값(관리자가 새로 만든 크기)은 색을 주지 않는다 */
const NEUTRAL: SizeTone = { chip: 'bg-flesh/70 text-shell', label: 'text-ink-soft' };

export function sizeToneOf(size: string): SizeTone {
  // "특대" 처럼 예전 표기로 저장된 것도 같은 색으로 보이게 한다
  const normalized = (SIZE_ALIASES[size] ?? size) as Size;
  const guide = SIZE_GUIDE.find((g) => g.size === normalized);
  return guide ? TONES[guide.tone] : NEUTRAL;
}
