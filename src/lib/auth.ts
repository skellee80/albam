import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
} from './session';

/**
 * 관리자 인증: 계정 없이 공유 비밀번호 하나.
 * 아버지가 쓸 화면이라 로그인 절차를 이보다 더 줄일 수 없다.
 */

/**
 * 길이가 달라도 안전하게 비교한다.
 * 두 값을 먼저 해시해서 길이를 맞춘 뒤 timingSafeEqual을 쓴다
 * (timingSafeEqual은 길이가 다르면 예외를 던지고, 길이 자체가 정보를 흘린다).
 */
function timingSafeCompare(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/* ────────────────────────────────────────────────────────────
 * 로그인 시도 제한
 *
 * 인스턴스 메모리 기반이라 완벽한 방어는 아니다(인스턴스가 늘면 우회 가능).
 * 목적은 비밀번호 하나짜리 화면에 대한 무차별 대입 속도를 늦추는 것이다.
 * ──────────────────────────────────────────────────────────── */

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

type Attempt = { count: number; firstAt: number };
const globalForAttempts = globalThis as unknown as { __albamAttempts?: Map<string, Attempt> };
const attempts = (globalForAttempts.__albamAttempts ??= new Map<string, Attempt>());

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
    return true;
  }
  record.count += 1;
  return record.count <= MAX_ATTEMPTS;
}

function clearRateLimit(key: string): void {
  attempts.delete(key);
}

/* ────────────────────────────────────────────────────────────
 * 세션
 * ──────────────────────────────────────────────────────────── */

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(password: string, clientKey = 'default'): Promise<LoginResult> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { ok: false, error: '서버에 관리자 비밀번호가 설정되지 않았습니다.' };
  }

  if (!checkRateLimit(clientKey)) {
    return { ok: false, error: '시도가 너무 많습니다. 10분 후에 다시 해주세요.' };
  }

  if (!timingSafeCompare(password, expected)) {
    return { ok: false, error: '비밀번호가 맞지 않습니다.' };
  }

  clearRateLimit(clientKey);

  const token = await createSessionToken();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return { ok: true };
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** 서버 액션에서 관리자 여부 확인 */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/**
 * 관리자 전용 서버 액션 앞에 반드시 세운다.
 *
 * middleware가 이미 /admin 경로를 막고 있지만, 서버 액션은 미들웨어를 거치지 않는
 * 경로로도 호출될 수 있으므로 액션 자체에서 한 번 더 확인한다.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error('관리자 인증이 필요합니다.');
}
