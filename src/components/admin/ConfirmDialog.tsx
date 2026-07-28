'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * 되돌리기 어려운 조작 앞에 세우는 확인 창.
 *
 * window.confirm 대신 쓰는 이유: 확인해야 할 값(입금자·수신자·금액)을 나란히
 * 보여줘야 하는데 브라우저 기본 창은 글자만 넣을 수 있다.
 * 아버지가 폰에서 누르므로 버튼을 크게, 위험한 쪽을 오른쪽에 둔다.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = '아니요',
  tone = 'primary',
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  pending?: boolean;
  onConfirm: () => void;
  /** 아니요 · ESC · 바깥 누르기. **아무것도 하지 않고 닫기만 해야 한다.** */
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // 열릴 때 확인 버튼으로 초점을 옮기고, ESC로 닫히게 한다
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);

    // 뒤 화면이 같이 스크롤되지 않게 잠근다
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 backdrop-blur-[2px] sm:items-center"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-[26rem] overflow-hidden rounded-card border border-line bg-surface shadow-[0_12px_40px_rgb(58_49_41/0.28)]"
      >
        <div className="px-5 pt-5">
          <h2 id="confirm-title" className="font-display text-[1.2rem] leading-snug">
            {title}
          </h2>
          <div className="mt-3">{children}</div>
        </div>

        <div className="mt-5 flex gap-2 border-t border-line bg-paper px-4 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="btn btn-outline flex-1"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`btn flex-1 ${tone === 'danger' ? 'btn-shell' : 'btn-primary'}`}
          >
            {pending ? '처리 중…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
