'use client';

import { useState } from 'react';

import { formatKRW, formatShortDateTime } from '@/lib/format';

export type UnmatchedText = {
  id: string;
  amount: number;
  depositorName: string;
  bankName: string;
  /** 받은 문자 원문. 해석에 실패한 건은 이것만 단서다. */
  rawText: string;
  receivedAt: number;
};

/**
 * 어느 주문에도 붙지 않은 문자들 — **참고용**이다.
 *
 * 아버지 개인 계좌라 가족 송금이나 다른 거래 문자가 섞여 들어온다. 그것까지 맨 위
 * 빨간 영역에 쌓이면 정작 급한 "확인이 필요한 입금"이 묻힌다. 그래서 맨 아래에
 * 접어 두고, 궁금할 때만 펴 본다. 폰으로 알림도 보내지 않는다.
 *
 * 최신순으로 놓는다 — 방금 온 문자를 찾으려고 아래까지 내려갈 이유가 없다.
 */
export function UnmatchedTexts({ texts }: { texts: UnmatchedText[] }) {
  const [open, setOpen] = useState(false);

  if (texts.length === 0) return null;

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="unmatched-texts"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[0.95rem] font-semibold text-ink-soft">
            기타 매칭되지 않은 문자
          </span>
          <span className="tnum mt-0.5 block text-[0.8rem] text-ink-faint">
            {texts.length}건 · 우리 주문과 상관없는 입금이거나 읽지 못한 문자입니다
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[0.82rem] font-semibold text-ink-soft">
          {open ? '접기' : '펴보기'}
          <Chevron open={open} />
        </span>
      </button>

      {open && (
        <div id="unmatched-texts" className="border-t border-line">
          <p className="bg-paper px-4 py-2.5 text-[0.8rem] leading-snug text-ink-soft">
            최신 문자가 위에 있습니다. 이 목록은 <b>보기만 하는 곳</b>입니다.
            <br />
            혹시 진짜 손님 입금이 여기 있으면, <b>주문관리</b>에서 그 주문을 찾아
            발송대기로 바꿔 주세요.
          </p>

          <ul className="divide-y divide-line">
            {texts.map((text) => (
              <li key={text.id} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[0.95rem] font-semibold">
                    {text.depositorName || '이름 없음'}
                  </span>
                  <span className="tnum shrink-0 text-[0.9rem] text-shell">
                    {text.amount > 0 ? formatKRW(text.amount) : '—'}
                  </span>
                </div>

                <p className="mt-0.5 text-[0.78rem] text-ink-faint">
                  {text.bankName || '은행 미상'} · {formatShortDateTime(text.receivedAt)}
                </p>

                {/* 원문이 있으면 그게 가장 확실한 단서다. 길어서 접어 둔다. */}
                {text.rawText && (
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[0.78rem] text-ink-faint underline underline-offset-2">
                      받은 문자 보기
                    </summary>
                    <pre className="mt-1.5 overflow-x-auto rounded-xl bg-paper px-3 py-2.5 text-[0.76rem] leading-relaxed whitespace-pre-wrap text-ink-soft">
                      {text.rawText}
                    </pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
