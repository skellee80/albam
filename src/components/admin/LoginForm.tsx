'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { adminLoginAction, type LoginState } from '@/app/admin/login/actions';

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(adminLoginAction, {
    error: null,
  });

  return (
    <form action={formAction} className="card mt-7 space-y-4 px-5 py-5">
      <input type="hidden" name="next" value={next} />

      <div>
        <label className="label" htmlFor="password">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="field text-[1.1rem]"
          autoComplete="current-password"
          autoFocus
          required
        />
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-berry-tint px-4 py-3 text-[0.9rem] font-semibold text-berry">
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-center text-[0.8rem] leading-relaxed text-ink-faint">
        한 번 들어오면 로그아웃하기 전까지 계속 유지됩니다.
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full text-[1.05rem]">
      {pending ? '확인 중…' : '들어가기'}
    </button>
  );
}
