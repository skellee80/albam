import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import { recordDeposit, recordUnparsedDeposit } from '@/lib/deposits';
import { parseDepositSms } from '@/lib/sms';

/**
 * MacroDroid 전용 입금 수신 엔드포인트.
 *
 * 아버지 폰의 MacroDroid가 입금 문자에서 **금액·입금자명·은행명**만 뽑아 여기로 보낸다.
 * 서버는 문자 원문을 파싱하지 않는다(PRD).
 *
 * 응답은 한 줄짜리 평문이다. MacroDroid가 이 본문을 그대로 알림에 띄운다.
 *
 * 한 번 세팅하면 다시 손대기 어려운 자리라 입력을 최대한 관대하게 받는다:
 *   - GET 쿼리스트링, POST JSON, POST form 전부 허용
 *   - 토큰은 파라미터로도, 헤더로도 받음
 *   - 금액은 "50,000원" 같은 형태도 숫자만 뽑아 인식
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function plain(body: string, status = 200) {
  return new NextResponse(body, {
    status,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function timingSafeCompare(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** "50,000원", "₩50000", " 50000 " → 50000 */
function parseAmount(value: unknown): number {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : NaN;
}

async function collectParams(request: NextRequest): Promise<Record<string, string>> {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  if (request.method !== 'POST') return params;

  const contentType = request.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      Object.assign(params, await request.json());
    } else if (
      contentType.includes('form-urlencoded') ||
      contentType.includes('multipart/form-data')
    ) {
      (await request.formData()).forEach((value, key) => {
        params[key] = String(value);
      });
    } else {
      // MacroDroid가 Content-Type을 붙이지 않는 경우가 있어 본문을 직접 살펴본다.
      const raw = (await request.text()).trim();
      if (raw.startsWith('{')) {
        Object.assign(params, JSON.parse(raw));
      } else if (raw) {
        new URLSearchParams(raw).forEach((value, key) => {
          params[key] = value;
        });
      }
    }
  } catch {
    // 본문을 못 읽어도 쿼리 파라미터만으로 처리할 수 있으면 계속 진행한다
  }

  return params;
}

async function handle(request: NextRequest) {
  const expectedToken = process.env.MACRODROID_TOKEN;
  if (!expectedToken) {
    console.error('[deposit] MACRODROID_TOKEN 이 설정되지 않았습니다.');
    return plain('❌ 서버 설정 오류: 토큰이 없습니다.', 500);
  }

  const params = await collectParams(request);
  const token = params.token ?? request.headers.get('x-albam-token') ?? '';

  if (!timingSafeCompare(token, expectedToken)) {
    return plain('❌ 인증 실패: 토큰이 맞지 않습니다.', 401);
  }

  // 문자를 통째로 보낸 경우 — 서버가 해석한다 (권장)
  const rawText = String(params.text ?? params.message ?? params.sms ?? params.body ?? '').trim();

  if (rawText) {
    return handleRawSms(rawText);
  }

  // 폰에서 이미 값을 뽑아 보낸 경우 — 예전 방식도 그대로 받는다
  const amount = parseAmount(params.amount ?? params.money ?? params.price);
  const depositorName = String(params.name ?? params.depositor ?? params.depositorName ?? '');
  const bankName = String(params.bank ?? params.bankName ?? '');

  try {
    const result = await recordDeposit({ amount, depositorName, bankName });
    // 판정 결과와 무관하게 200으로 답한다.
    // 오류 코드를 주면 MacroDroid가 재시도를 반복하면서 알림만 계속 울린다.
    return plain(result.message);
  } catch (err) {
    console.error('[deposit]', err);
    return plain('❌ 처리 실패: 관리자 화면에서 직접 확인해 주세요.');
  }
}

/**
 * 문자 원문을 받아 서버에서 값을 뽑는다.
 *
 * 해석에 실패해도 **기록은 남긴다.** 원문이 관리자 화면에 보여야
 * 왜 실패했는지 알고 해석 규칙을 고칠 수 있다. 아무 흔적 없이 사라지면
 * 돈은 들어왔는데 아무도 모르는 상태가 된다.
 */
async function handleRawSms(rawText: string) {
  const parsed = parseDepositSms(rawText);

  if (!parsed.ok) {
    try {
      await recordUnparsedDeposit(rawText, parsed.reason);
    } catch (err) {
      console.error('[deposit] 해석 실패 기록 실패', err);
    }
    return plain(`❓ 문자를 읽지 못했습니다: ${parsed.reason} 관리자에서 확인하세요.`);
  }

  try {
    const result = await recordDeposit({
      amount: parsed.amount,
      depositorName: parsed.depositorName,
      bankName: parsed.bankName,
      rawText,
    });
    return plain(result.message);
  } catch (err) {
    console.error('[deposit]', err);
    return plain('❌ 처리 실패: 관리자 화면에서 직접 확인해 주세요.');
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
