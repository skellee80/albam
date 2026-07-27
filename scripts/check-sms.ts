/**
 * 입금 문자가 서버에서 어떻게 해석되는지 확인하는 도구.
 *
 *   npm run sms -- "<새마을금고>382710**5 김지수 입금450,000 잔액1,600,000원 07/26 21:58"
 *   npm run sms                # 알려진 은행 형식 자체 점검
 *
 * **서버가 쓰는 해석기(src/lib/sms.ts)를 그대로 불러온다.** 규칙을 두 벌로 두면
 * 여기서는 되는데 실제로는 안 되는 일이 생긴다.
 *
 * 은행이 바뀌었을 때 이 명령으로 먼저 확인하고, 안 되면 src/lib/sms.ts 의 규칙을 고친다.
 * 폰은 문자를 통째로 보내기만 하므로 아버지 폰은 건드릴 필요가 없다.
 */
import { explainSms, parseDepositSms } from '../src/lib/sms';

const SAMPLES: { bank: string; text: string; amount: number; name: string }[] = [
  {
    bank: '새마을금고 (이름이 입금 앞)',
    text: '<새마을금고>382710**5 김지수 입금450,000 잔액1,600,000원 07/26 21:58',
    amount: 450000,
    name: '김지수',
  },
  {
    bank: '농협 (이름이 맨 끝)',
    text: '[Web발신]\nNH농협 04/15 12:34\n352-****-1234-56\n입금 50,000\n잔액 1,234,567\n홍길동',
    amount: 50000,
    name: '홍길동',
  },
  {
    bank: '국민 (이름이 금액 뒤)',
    text: '[Web발신]\nKB국민 04/15 14:22\n123456-**-7890\n입금 50,000\n홍길동\n잔액 500,000',
    amount: 50000,
    name: '홍길동',
  },
  {
    bank: '카카오뱅크',
    text: '[Web발신]\n카카오뱅크\n입금 50,000원\n홍길동\n잔액 100,000원',
    amount: 50000,
    name: '홍길동',
  },
  {
    bank: '신한 (한 줄)',
    text: '[Web발신] 신한 04/15 12:34 110-***-123456 입금 50,000 홍길동 잔액 1,000,000',
    amount: 50000,
    name: '홍길동',
  },
];

function analyze(text: string): boolean {
  const { amount, name, result } = explainSms(text);

  console.log(`\n  문자: ${text.replace(/\n/g, ' ⏎ ')}`);

  const show = (title: string, rows: { label: string; value: string | null; rejected: boolean }[]) => {
    console.log(`\n  ${title}`);
    for (const row of rows) {
      const mark = row.rejected ? '✗' : row.value ? '·' : ' ';
      const note = row.rejected ? '  ← 이름이 아님' : '';
      console.log(
        `    ${mark} ${row.label.padEnd(18)} ${row.value ? JSON.stringify(row.value) : '(못 찾음)'}${note}`,
      );
    }
  };

  show('입금액 후보', amount);
  show('입금자명 후보', name);

  if (!result.ok) {
    console.log(`\n  ❌ 해석 실패 — ${result.reason}`);
    console.log('     src/lib/sms.ts 의 규칙을 이 문자에 맞게 고쳐야 합니다.');
    return false;
  }

  console.log('\n  ✅ 서버가 이렇게 읽습니다');
  console.log(`     입금액   : ${result.amount.toLocaleString('ko-KR')}원`);
  console.log(`     입금자명 : ${result.depositorName}`);
  console.log(`     은행     : ${result.bankName || '(못 찾음 — 은행 대조를 건너뜁니다)'}`);
  console.log(`     적용 규칙: ${result.rule}`);
  return true;
}

const input = process.argv.slice(2).join(' ').trim();

if (input) {
  process.exit(analyze(input) ? 0 : 1);
}

console.log('알려진 은행 문자 형식 점검');
let failed = 0;

for (const sample of SAMPLES) {
  const r = parseDepositSms(sample.text);
  const ok = r.ok && r.amount === sample.amount && r.depositorName === sample.name;
  if (!ok) failed++;
  const got = r.ok ? `${r.amount.toLocaleString('ko-KR')} / ${r.depositorName} / ${r.bankName}` : r.reason;
  console.log(`  ${ok ? '✓' : '✗'} ${sample.bank.padEnd(24)} ${got}`);
}

// 출금 문자가 입금으로 처리되면 돈을 받지 않은 주문이 발송대기로 올라간다
const withdrawal = parseDepositSms('<새마을금고>382710**5 출금50,000 잔액1,000,000원');
if (withdrawal.ok) {
  failed++;
  console.log('  ✗ 출금 문자를 입금으로 잘못 읽음');
} else {
  console.log('  ✓ 출금 문자는 해석하지 않음');
}

console.log(`\n${'─'.repeat(56)}`);
console.log(`${failed === 0 ? '전부 통과' : `${failed}건 실패`}`);
console.log('\n내 문자로 확인하려면:');
console.log('  npm run sms -- "받은 문자를 따옴표 안에 그대로"');
process.exit(failed > 0 ? 1 : 0);
