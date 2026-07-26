/**
 * 주문 합치기 흐름을 실제 서버 액션 경로로 확인한다.
 *
 *   node scripts/e2e-merge.mjs <port>
 *
 * 에뮬레이터 + dev 서버가 떠 있어야 한다. 주문/입금 데이터를 건드리므로 로컬 전용.
 */
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';

const PORT = process.argv[2] ?? '3000';
const BASE = `http://localhost:${PORT}`;
const TOKEN = 'local-dev-macrodroid-token';

let pass = 0;
let fail = 0;
const check = (label, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}${detail ? `  → ${detail}` : ''}`);
  }
};

const { initializeApp } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const db = getFirestore(initializeApp({ projectId: 'albam-416fd' }));

const { createOrder, findMergeableOrders, mergeWithExistingOrder, getOrder } = await import(
  '../src/lib/orders.ts'
);

const products = await db.collection('products').get();
const daebo = products.docs.find((d) => d.data().name === '대보 중 4kg');
const price = daebo.data().price;

console.log('\n손님이 입금 전에 또 주문하는 상황');

const first = await createOrder({
  lines: [{ productId: daebo.id, qty: 1 }],
  depositorName: '합산테스트',
  depositorPhone: '010-7777-7777',
  sameAsDepositor: true,
  recipient: { name: '합산테스트', phone: '010-7777-7777', address: '서울시 어딘가' },
});
check('첫 주문이 들어간다', first.ok, JSON.stringify(first));

const found = await findMergeableOrders('합산테스트', '010-7777-7777');
check('두 번째 주문 전에 기존 입금대기 주문을 찾는다', found.length === 1, `${found.length}건`);

console.log('\n합치지 않고 따로 두면 — 합산 입금이 매칭되지 않는다');

const second = await createOrder({
  lines: [{ productId: daebo.id, qty: 2 }],
  depositorName: '합산테스트',
  depositorPhone: '010-7777-7777',
  sameAsDepositor: true,
  recipient: { name: '합산테스트', phone: '010-7777-7777', address: '서울시 어딘가' },
});
check('따로 주문도 들어간다', second.ok);

const combined = first.amountToPay + second.amountToPay;
const missed = await fetch(`${BASE}/api/deposit`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ token: TOKEN, amount: String(combined), name: '합산테스트', bank: '농협' }),
});
const missedText = await missed.text();
check('합산 금액으로 보내면 미매칭이 된다 (합치기가 필요한 이유)', missedText.includes('미매칭'), missedText);

console.log('\n합치면 — 합산 입금이 한 번에 확정된다');

const merged = await mergeWithExistingOrder(first.orderId, {
  lines: [{ productId: daebo.id, qty: 2 }],
  depositorName: '합산테스트',
  depositorPhone: '010-7777-7777',
  sameAsDepositor: true,
  recipient: { name: '합산테스트', phone: '010-7777-7777', address: '서울시 어딘가' },
});
check('합치기가 성공한다', merged.ok, JSON.stringify(merged));
check('금액이 합산된다', merged.ok && merged.amountToPay === price * 3, `${merged.amountToPay}`);

// 은행 표기를 바꿔 보낸다. 위에서 같은 (금액·이름·은행)으로 이미 한 번 보냈기 때문에
// 그대로 다시 보내면 중복 방지에 걸려 앞선 미매칭 문구가 그대로 돌아온다.
// "NH농협"은 판매 계좌(농협)와 같은 은행으로 인정되면서 중복 키는 달라진다.
const okRes = await fetch(`${BASE}/api/deposit`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    token: TOKEN,
    amount: String(merged.amountToPay),
    name: '합산테스트',
    bank: 'NH농협',
  }),
});
const okText = await okRes.text();
check('합친 금액으로 보내면 확정된다', okText.includes('확정'), okText);

const after = await getOrder(first.orderId);
check('주문이 발송대기로 넘어간다', after?.status === '발송대기', after?.status);

console.log('\n상태를 되돌리면 손님 화면의 진행 단계도 되돌아간다');

const { updateOrder, lookupOrders } = await import('../src/lib/orders.ts');
await updateOrder(first.orderId, { status: '입금대기' });
const reverted = await lookupOrders('합산테스트', '010-7777-7777');
check('입금 확인 시각이 지워진다', reverted[0]?.paidAt === null, `${reverted[0]?.paidAt}`);
check('상태도 입금대기로 보인다', reverted[0]?.status === '입금대기', reverted[0]?.status);

console.log(`\n${'─'.repeat(46)}\n통과 ${pass}건, 실패 ${fail}건`);
process.exit(fail > 0 ? 1 : 0);
