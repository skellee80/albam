/**
 * 입금 문자에서 값이 제대로 뽑히는지 미리 확인하는 도구.
 *
 *   npm run sms -- "<새마을금고>382710**5 김지수 입금450,000 잔액1,600,000원 07/26 21:58"
 *
 * 은행이 바뀌거나 문자 형식이 달라졌을 때, 폰에 정규식을 타이핑하기 전에
 * 여기서 먼저 맞는지 본다. MacroDroid에 그대로 넣을 정규식을 알려준다.
 *
 * 인자를 주지 않으면 알려진 은행 형식들로 자체 점검을 돌린다.
 */

/** 입금액 후보 — 위에서부터 맞는 것을 쓴다 */
const AMOUNT_RULES = [
  { label: '입금 뒤의 숫자', re: /입금\s*([\d,]+)/ },
  { label: '입금액 뒤의 숫자', re: /입금액\s*[:：]?\s*([\d,]+)/ },
];

/** 입금자명 후보 — 이름이 문자 어디에 있느냐에 따라 달라진다 */
const NAME_RULES = [
  { label: '이름이 "입금" 바로 앞', re: /([가-힣]{2,10})\s*입금/ },
  { label: '이름이 입금액 바로 뒤', re: /입금\s*[\d,]+원?\s*([가-힣]{2,10})/ },
  { label: '이름이 맨 마지막 줄', re: /([가-힣]{2,10})\s*$/ },
  { label: '이름이 잔액 뒤', re: /잔액\s*[\d,]+원?\s*([가-힣]{2,10})/ },
];

/**
 * 이름 자리에 잡히면 안 되는 낱말.
 *
 * 정규식이 얼추 맞는 것처럼 보여도 엉뚱한 것을 집는 일이 흔하다.
 * - "잔액" : 이름이 금액 뒤에 있다고 보면 잔액을 집는다
 * - 은행 이름 : "카카오뱅크 입금 50,000" 처럼 은행명이 입금 바로 앞에 오는 형식이 있다
 */
const NOT_A_NAME = [
  '잔액',
  '입금',
  '출금',
  '이체',
  '거래',
  '누적',
  '원',
  // 은행·금고 이름
  '새마을금고',
  '농협',
  '국민',
  '신한',
  '우리',
  '하나',
  '기업',
  '카카오뱅크',
  '케이뱅크',
  '토스뱅크',
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

function firstMatch(rules, text) {
  for (const rule of rules) {
    const value = text.match(rule.re)?.[1];
    if (value && !NOT_A_NAME.includes(value)) return { ...rule, value };
  }
  return null;
}

/** 규칙별로 무엇이 잡히는지 전부 보여준다 (왜 틀렸는지 알 수 있게) */
function report(title, rules, text, chosen) {
  console.log(`\n  ${title}`);
  for (const rule of rules) {
    const value = text.match(rule.re)?.[1];
    const isChosen = chosen && rule.re.source === chosen.re.source;
    const bad = value && NOT_A_NAME.includes(value);
    const mark = isChosen ? '✓' : bad ? '✗' : value ? '·' : ' ';
    const note = bad ? '  ← 이름이 아님' : '';
    console.log(
      `    ${mark} ${rule.label.padEnd(18)} ${value ? JSON.stringify(value) : '(못 찾음)'}${note}`,
    );
  }
}

function analyze(text) {
  console.log(`\n  문자: ${text.replace(/\n/g, ' ⏎ ')}`);

  const amount = firstMatch(AMOUNT_RULES, text);
  const name = firstMatch(NAME_RULES, text);

  report('입금액', AMOUNT_RULES, text, amount);
  report('입금자명', NAME_RULES, text, name);

  if (!amount || !name) {
    console.log('\n  ⚠️  못 뽑은 값이 있습니다. 아래 정규식을 문자에 맞게 고쳐야 합니다.');
    return false;
  }

  console.log('\n  MacroDroid 텍스트 조작에 넣을 값');
  console.log(`    amount 정규식 : ${amount.re.source}`);
  console.log(`    name   정규식 : ${name.re.source}`);
  console.log(`    (결과: 금액 ${amount.value} / 이름 ${name.value})`);
  return true;
}

/* ────────────────────────────────────────────────────────────
 * 실행
 * ──────────────────────────────────────────────────────────── */

const input = process.argv.slice(2).join(' ').trim();

if (input) {
  process.exit(analyze(input) ? 0 : 1);
}

// 인자가 없으면 알려진 형식들로 자체 점검
const SAMPLES = [
  {
    bank: '새마을금고 (이름이 입금 앞)',
    text: '<새마을금고>382710**5 김지수 입금450,000 잔액1,600,000원 07/26 21:58',
    expect: { amount: '450,000', name: '김지수' },
  },
  {
    bank: '농협 (이름이 맨 끝)',
    text: '[Web발신]\nNH농협 04/15 12:34\n352-****-1234-56\n입금 50,000\n잔액 1,234,567\n홍길동',
    expect: { amount: '50,000', name: '홍길동' },
  },
  {
    bank: '국민 (이름이 금액 뒤)',
    text: '[Web발신]\nKB국민 04/15 14:22\n123456-**-7890\n입금 50,000\n홍길동\n잔액 500,000',
    expect: { amount: '50,000', name: '홍길동' },
  },
  {
    bank: '카카오뱅크',
    text: '[Web발신]\n카카오뱅크\n입금 50,000원\n홍길동\n잔액 100,000원',
    expect: { amount: '50,000', name: '홍길동' },
  },
  {
    bank: '신한 (한 줄)',
    text: '[Web발신] 신한 04/15 12:34 110-***-123456 입금 50,000 홍길동 잔액 1,000,000',
    expect: { amount: '50,000', name: '홍길동' },
  },
];

let failed = 0;
console.log('알려진 은행 문자 형식 점검');

for (const sample of SAMPLES) {
  const amount = firstMatch(AMOUNT_RULES, sample.text);
  const name = firstMatch(NAME_RULES, sample.text);
  const ok = amount?.value === sample.expect.amount && name?.value === sample.expect.name;
  if (!ok) failed++;
  console.log(
    `  ${ok ? '✓' : '✗'} ${sample.bank.padEnd(24)} 금액 ${amount?.value ?? '-'} / 이름 ${name?.value ?? '-'}`,
  );
}

console.log(`\n${'─'.repeat(56)}`);
console.log(`${SAMPLES.length - failed}건 통과, ${failed}건 실패`);
console.log('\n내 문자로 확인하려면:');
console.log('  npm run sms -- "받은 문자를 따옴표 안에 그대로"');
process.exit(failed > 0 ? 1 : 0);
