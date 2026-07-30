import { BRAND } from '@/lib/brand';

/**
 * 가게 이름.
 *
 * 예전에는 여기를 열 번 누르면 관리자 화면으로 넘어갔다. 화면 맨 위에 있어
 * 스크롤을 올리다 손가락이 스치는 일이 잦아, 그 숨은 문은 목록 사이의
 * 크기 안내 카드로 옮겼다(SizeGuide).
 *
 * 링크로 두지 않는다. 홈으로 가는 길은 아래 "상품" 메뉴가 맡는다.
 */
export function BrandTitle() {
  return (
    <span className="block text-center font-display text-[1.19rem] leading-tight tracking-tight">
      {BRAND.full}
    </span>
  );
}
