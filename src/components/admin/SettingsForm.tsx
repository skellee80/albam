'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { updateSettingsAction } from '@/app/admin/actions';
import type { Settings } from '@/lib/types';

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Settings>(settings);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateSettingsAction({
        bankName: draft.bankName.trim(),
        bankAccount: draft.bankAccount.trim(),
        bankHolder: draft.bankHolder.trim(),
        contactPhone: draft.contactPhone.trim(),
      });
      setMessage(
        result.ok ? { kind: 'ok', text: '저장했습니다.' } : { kind: 'error', text: result.error },
      );
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="mt-3 space-y-5">
      <section className="card px-4 py-4">
        <h2 className="font-display text-[1.1rem]">입금 받을 계좌</h2>
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">
          주문을 마친 손님에게 이 계좌가 그대로 보입니다.
        </p>

        <div className="mt-3.5 space-y-3">
          <div>
            <label className="label" htmlFor="bankName">
              은행
            </label>
            <input
              id="bankName"
              className="field"
              value={draft.bankName}
              onChange={(e) => set('bankName', e.target.value)}
              placeholder="예: 농협"
            />
          </div>

          <div>
            <label className="label" htmlFor="bankAccount">
              계좌번호
            </label>
            <input
              id="bankAccount"
              className="field tnum"
              value={draft.bankAccount}
              onChange={(e) => set('bankAccount', e.target.value)}
              inputMode="numeric"
              placeholder="000-0000-0000-00"
            />
          </div>

          <div>
            <label className="label" htmlFor="bankHolder">
              예금주
            </label>
            <input
              id="bankHolder"
              className="field"
              value={draft.bankHolder}
              onChange={(e) => set('bankHolder', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card px-4 py-4">
        <h2 className="font-display text-[1.1rem]">문의 전화번호</h2>
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">
          배송 조회에서 주문을 못 찾은 손님에게 안내되는 번호입니다.
        </p>

        <div className="mt-3.5">
          <label className="label" htmlFor="contactPhone">
            전화번호
          </label>
          <input
            id="contactPhone"
            className="field tnum"
            value={draft.contactPhone}
            onChange={(e) => set('contactPhone', e.target.value)}
            inputMode="tel"
            placeholder="010-0000-0000"
          />
        </div>
      </section>

      {message && (
        <p
          role="alert"
          className={`rounded-xl px-4 py-3 text-[0.9rem] font-semibold ${
            message.kind === 'ok' ? 'bg-burr-tint text-burr-deep' : 'bg-berry-tint text-berry'
          }`}
        >
          {message.text}
        </p>
      )}

      <button type="button" onClick={save} disabled={pending} className="btn btn-primary w-full text-[1.05rem]">
        {pending ? '저장 중…' : '저장하기'}
      </button>
    </div>
  );
}
