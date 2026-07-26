'use client';

import { useState } from 'react';

/**
 * 송장번호 표시.
 *
 * 우체국 배송조회 연동은 아직 붙이지 않았다(이번 범위 밖).
 * 나중에 조회 API를 넣을 때 바깥을 건드리지 않도록 이 컴포넌트 안에서만 끝나게 분리해 뒀다.
 * 지금은 번호를 보여주고 복사할 수 있게만 한다.
 */
export function TrackingNumber({ trackingNo }: { trackingNo: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(trackingNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-3.5 rounded-xl bg-burr-tint px-3.5 py-3">
      <p className="text-[0.78rem] font-semibold text-burr-deep">우체국 송장번호</p>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="tnum text-[1.05rem] font-bold tracking-tight">{trackingNo}</span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-full bg-surface px-3.5 py-2 text-[0.78rem] font-semibold text-burr-deep"
        >
          {copied ? '복사됨' : '복사'}
        </button>
      </div>
    </div>
  );
}
