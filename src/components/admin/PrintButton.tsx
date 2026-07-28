'use client';

/** 인쇄 창을 연다. 브라우저 메뉴를 찾아 들어가지 않아도 되도록 큰 버튼으로 둔다. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn btn-primary min-h-11 shrink-0 px-5 text-[0.9rem]"
    >
      인쇄하기
    </button>
  );
}
