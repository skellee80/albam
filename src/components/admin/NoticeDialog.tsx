'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * 알려주기만 하는 창. 버튼이 하나뿐이다.
 *
 * 결과를 작은 글씨 한 줄로 흘려보내면 아버지는 저장이 됐는지 모르고 다시 누른다.
 * 화면을 덮고 확인을 한 번 받아야 "됐다"가 전달된다.
 *
 * 고를 것이 있는 창은 ConfirmDialog 를 쓴다. 이건 결과를 알리는 쪽이다.
 */
export function NoticeDialog({
  open,
  tone = 'ok',
  title,
  children,
  closeLabel = '확인',
  onClose,
}: {
  open: boolean;
  /** ok 됐다 · warn 막혔지만 고칠 수 있다 · error 실패했다 */
  tone?: 'ok' | 'warn' | 'error';
  title: string;
  children?: ReactNode;
  closeLabel?: string;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const badge = {
    ok: { mark: '✓', ring: 'bg-burr-tint text-burr-deep' },
    warn: { mark: '!', ring: 'bg-amber-tint text-amber' },
    error: { mark: '!', ring: 'bg-berry-tint text-berry' },
  }[tone];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notice-title"
        className="w-full max-w-[24rem] overflow-hidden rounded-card border border-line bg-surface shadow-[0_12px_40px_rgb(58_49_41/0.28)]"
      >
        <div className="px-5 pt-6 pb-1 text-center">
          <span
            aria-hidden="true"
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full text-[1.5rem] leading-none font-bold ${badge.ring}`}
          >
            {badge.mark}
          </span>
          <h2 id="notice-title" className="mt-3 font-display text-[1.2rem] leading-snug">
            {title}
          </h2>
          {children && (
            <div className="mt-2 text-[0.87rem] leading-relaxed text-ink-soft">{children}</div>
          )}
        </div>

        <div className="mt-5 border-t border-line bg-paper px-4 py-3.5">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn btn-primary w-full"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
