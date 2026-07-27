/**
 * 입금 문자에서 금액·입금자명·은행을 뽑아낸다.
 *
 * 이 해석기를 **폰이 아니라 서버에 두는 이유**:
 * 정규식은 어디엔가 반드시 있어야 하는데, 폰(MacroDroid) 안에 있으면
 * 은행이 문자 형식을 바꿀 때마다 아버지 폰을 직접 받아서 고쳐야 한다.
 * 서버에 두면 코드를 고쳐 배포하면 끝이고, 실패한 문자 원문이 관리자 화면에 남아
 * 무엇 때문에 실패했는지 볼 수 있다. 테스트도 붙일 수 있다.
 *
 * 그래서 MacroDroid는 문자를 통째로 보내기만 하면 된다 — 변수도 정규식도 필요 없다.
 *
 * 규칙을 고치면 `npm run sms` 로 알려진 은행 형식들이 여전히 통과하는지 확인할 것.
 */

/** 입금액 후보 — 위에서부터 맞는 것을 쓴다 */
const AMOUNT_RULES: { label: string; re: RegExp }[] = [
  { label: '입금 뒤의 숫자', re: /입금\s*([\d,]+)/ },
  { label: '입금액 뒤의 숫자', re: /입금액\s*[:：]?\s*([\d,]+)/ },
];

/** 입금자명 후보 — 이름이 문자 어디에 있느냐에 따라 다르다 */
const NAME_RULES: { label: string; re: RegExp }[] = [
  { label: '이름이 "입금" 바로 앞', re: /([가-힣]{2,10})\s*입금/ },
  { label: '이름이 입금액 바로 뒤', re: /입금\s*[\d,]+원?\s*([가-힣]{2,10})/ },
  { label: '이름이 맨 마지막 줄', re: /([가-힣]{2,10})\s*$/ },
  { label: '이름이 잔액 뒤', re: /잔액\s*[\d,]+원?\s*([가-힣]{2,10})/ },
];

/** 문자에 이 이름이 보이면 그 은행에서 온 것으로 본다 */
const BANKS = [
  '새마을금고',
  '카카오뱅크',
  '케이뱅크',
  '토스뱅크',
  '농협',
  '국민',
  '신한',
  '우리',
  '하나',
  '기업',
  '수협',
  '우체국',
  '부산',
  '대구',
  '광주',
  '전북',
  '경남',
  '제주',
  '산업',
  '신협',
  '저축은행',
];

/**
 * 이름 자리에 잡히면 안 되는 낱말.
 *
 * - "잔액" : 이름이 금액 뒤에 있다고 보면 잔액을 집는다
 * - 은행 이름 : "카카오뱅크 입금 50,000" 처럼 은행명이 입금 바로 앞에 오는 형식이 있다
 */
const NOT_A_NAME = new Set(['잔액', '입금', '출금', '이체', '거래', '누적', '원', ...BANKS]);

export type ParsedSms =
  | { ok: true; amount: number; depositorName: string; bankName: string; rule: string }
  | { ok: false; reason: string };

function firstMatch(rules: { label: string; re: RegExp }[], text: string) {
  for (const rule of rules) {
    const value = text.match(rule.re)?.[1];
    if (value && !NOT_A_NAME.has(value)) return { label: rule.label, value };
  }
  return null;
}

/** 문자 안에 보이는 은행 이름. 못 찾으면 빈 문자열(= 은행 대조를 건너뛴다). */
export function detectBank(text: string): string {
  return BANKS.find((bank) => text.includes(bank)) ?? '';
}

/**
 * 입금 문자 한 통을 해석한다.
 *
 * 출금·이체 문자가 섞여 들어오면 **일부러 실패시킨다.** 출금 5만 원이 입금 5만 원으로
 * 처리되면 돈을 받지 않은 주문이 발송대기로 올라가기 때문이다.
 */
export function parseDepositSms(text: string): ParsedSms {
  const raw = (text ?? '').trim();
  if (!raw) return { ok: false, reason: '문자 내용이 비어 있습니다.' };

  if (!raw.includes('입금')) {
    return { ok: false, reason: '입금 문자가 아닙니다 ("입금"이라는 글자가 없습니다).' };
  }

  const amount = firstMatch(AMOUNT_RULES, raw);
  if (!amount) return { ok: false, reason: '입금액을 찾지 못했습니다.' };

  const numeric = Number(amount.value.replace(/[^\d]/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { ok: false, reason: `입금액을 숫자로 읽지 못했습니다 (${amount.value}).` };
  }

  const name = firstMatch(NAME_RULES, raw);
  if (!name) return { ok: false, reason: '입금자명을 찾지 못했습니다.' };

  return {
    ok: true,
    amount: numeric,
    depositorName: name.value,
    bankName: detectBank(raw),
    rule: `금액: ${amount.label} / 이름: ${name.label}`,
  };
}

/** 어떤 규칙이 무엇을 잡았는지 전부 보여준다 (npm run sms 도구용) */
export function explainSms(text: string) {
  const show = (rules: { label: string; re: RegExp }[]) =>
    rules.map((rule) => {
      const value = text.match(rule.re)?.[1] ?? null;
      return { label: rule.label, value, rejected: value !== null && NOT_A_NAME.has(value) };
    });

  return {
    amount: show(AMOUNT_RULES),
    name: show(NAME_RULES),
    result: parseDepositSms(text),
  };
}
