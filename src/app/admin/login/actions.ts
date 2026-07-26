'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { login } from '@/lib/auth';

export type LoginState = { error: string | null };

export async function adminLoginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/admin');

  // 시도 제한은 요청 IP 기준으로 센다.
  const headerList = await headers();
  const clientKey =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    'unknown';

  const result = await login(password, clientKey);
  if (!result.ok) return { error: result.error };

  // 열린 리다이렉트가 되지 않도록 /admin 하위 경로만 허용한다.
  const destination = next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
  redirect(destination);
}
