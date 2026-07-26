/**
 * 도메인 로직 점검 스크립트 (에뮬레이터 전용).
 *
 *   npm run emulators   # 다른 터미널
 *   npm run smoke
 *
 * 실제 Firestore를 지우는 사고를 막기 위해 FIRESTORE_EMULATOR_HOST 가 없으면 즉시 중단한다.
 *
 * 가격 재계산, 입금 매칭 3분기, 재전송 중복 방지, 재고 복원 같은
 * "틀리면 아버지가 손으로 수습해야 하는" 부분만 골라서 검증한다.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('중단: FIRESTORE_EMULATOR_HOST 가 설정되어 있지 않습니다.');
  console.error('이 스크립트는 에뮬레이터에서만 실행합니다.');
  process.exit(1);
}

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail ? `  → ${detail}` : ''}`);
  }
}

function section(title: string): void {
  console.log(`\n${title}`);
}

async function main() {
  const { COL, db } = await import('../src/lib/firebase-admin');
  const { createOrder, updateOrder, listOrders, lookupOrders, getOrder } = await import(
    '../src/lib/orders'
  );
  const { recordDeposit } = await import('../src/lib/deposits');
  const { listProducts } = await import('../src/lib/products');

  // ── 초기화: 주문/입금/채번만 지우고 상품 재고는 되돌린다 ──
  for (const col of [COL.orders, COL.deposits, COL.counters]) {
    const snap = await db.collection(col).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
  const products = await listProducts();
  if (products.length === 0) {
    console.error('상품이 없습니다. 먼저 `npm run seed` 를 실행하세요.');
    process.exit(1);
  }
  await Promise.all(
    products.map((p) => db.collection(COL.products).doc(p.id).update({ stock: p.initialStock })),
  );

  const daeboMid = products.find((p) => p.name === '대보 중')!;
  const okgwangLarge = products.find((p) => p.name === '옥광 특대')!;

  /* ────────────────────────────────────────────── */
  section('1. 주문 생성 — 서버 가격 재계산 / 재고 선점');

  const created = await createOrder({
    lines: [
      { productId: daeboMid.id, qty: 2 },
      { productId: okgwangLarge.id, qty: 1 },
    ],
    depositorName: '홍길동',
    sameAsDepositor: true,
    recipient: { name: '홍길동', phone: '010-1111-2222', address: '서울시 어딘가 1-2' },
  });

  check('주문이 생성된다', created.ok, JSON.stringify(created));
  if (!created.ok) throw new Error('이후 검증 불가');

  const expectedTotal = daeboMid.price * 2 + okgwangLarge.price;
  check(
    `총액이 서버 가격으로 계산된다 (${expectedTotal.toLocaleString('ko-KR')}원)`,
    created.totalAmount === expectedTotal,
    `실제 ${created.totalAmount}`,
  );
  check('주문번호가 YYYYMMDD-0001 형식이다', /^\d{8}-0001$/.test(created.orderNo), created.orderNo);

  const afterOrder = await listProducts();
  check(
    '주문 즉시 재고가 차감된다',
    afterOrder.find((p) => p.id === daeboMid.id)!.stock === daeboMid.initialStock - 2,
  );

  // 같은 상품을 여러 줄로 보내도 합쳐져야 한다 (트랜잭션 중복 읽기 방지)
  const mergedOrder = await createOrder({
    lines: [
      { productId: daeboMid.id, qty: 1 },
      { productId: daeboMid.id, qty: 2 },
    ],
    depositorName: '중복상품',
    sameAsDepositor: true,
    recipient: { name: '중복상품', phone: '010-9999-0000', address: '부산시 어딘가' },
  });
  check(
    '같은 상품이 여러 줄로 와도 한 줄로 합쳐진다',
    mergedOrder.ok && mergedOrder.items.length === 1 && mergedOrder.items[0].qty === 3,
    JSON.stringify(mergedOrder),
  );

  const overStock = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 99999 }],
    depositorName: '과다주문',
    sameAsDepositor: true,
    recipient: { name: '과다주문', phone: '010-3333-4444', address: '대구시 어딘가' },
  });
  check('재고보다 많이 주문하면 거절된다', !overStock.ok, JSON.stringify(overStock));

  const noPhone = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '전화없음',
    sameAsDepositor: true,
    recipient: { name: '전화없음', phone: '123', address: '광주시 어딘가' },
  });
  check('전화번호가 부실하면 거절된다', !noPhone.ok);

  /* ────────────────────────────────────────────── */
  section('2. 입금 매칭 — 1건 확정');

  const exact = await recordDeposit({
    amount: expectedTotal,
    depositorName: '홍 길동', // 은행 문자에 공백이 섞여도 매칭되어야 한다
    bankName: '농협',
  });
  check('금액·이름이 맞으면 확정된다', exact.status === '확정', exact.message);
  check('확정 응답에 상품 요약이 들어간다', exact.message.includes('대보 중'), exact.message);

  const confirmedOrder = await getOrder(created.orderId);
  check('주문이 발송대기로 넘어간다', confirmedOrder?.status === '발송대기', confirmedOrder?.status);
  check('입금 시각이 기록된다', typeof confirmedOrder?.paidAt === 'number');

  /* ────────────────────────────────────────────── */
  section('3. 입금 재전송 — 중복 방지');

  const again = await recordDeposit({
    amount: expectedTotal,
    depositorName: '홍 길동',
    bankName: '농협',
  });
  check('같은 입금이 다시 오면 중복으로 처리된다', again.duplicate, JSON.stringify(again));
  check('중복이어도 처음 문구를 그대로 돌려준다', again.message === exact.message);

  const depositCount = (await db.collection(COL.deposits).get()).size;
  check('입금 기록이 1건만 남는다', depositCount === 1, `실제 ${depositCount}건`);

  /* ────────────────────────────────────────────── */
  section('4. 입금 매칭 — 동명이인은 확인필요');

  const twinA = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '김철수',
    sameAsDepositor: true,
    recipient: { name: '김철수', phone: '010-5555-6666', address: '인천시 어딘가' },
  });
  const twinB = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '김철수',
    sameAsDepositor: true,
    recipient: { name: '김철수', phone: '010-7777-8888', address: '수원시 어딘가' },
  });
  check('동명이인 주문 2건이 만들어진다', twinA.ok && twinB.ok);

  const ambiguous = await recordDeposit({
    amount: daeboMid.price,
    depositorName: '김철수',
    bankName: '국민',
  });
  check('후보가 여러 건이면 확인필요가 된다', ambiguous.status === '확인필요', ambiguous.message);
  check('후보 건수가 문구에 들어간다', ambiguous.message.includes('2건'), ambiguous.message);

  /* ────────────────────────────────────────────── */
  section('5. 입금 매칭 — 금액이 다르면 미매칭');

  const wrongAmount = await recordDeposit({
    amount: 12345,
    depositorName: '박영희',
    bankName: '신한',
  });
  check('맞는 주문이 없으면 미매칭이 된다', wrongAmount.status === '미매칭', wrongAmount.message);

  /* ────────────────────────────────────────────── */
  section('6. 재고 복원 — 정확히 한 번만');

  const stockBeforeCancel = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;

  await updateOrder(twinA.ok ? twinA.orderId : '', { status: '취소' });
  const stockAfterCancel = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;
  check('취소하면 재고가 돌아온다', stockAfterCancel === stockBeforeCancel + 1, `${stockBeforeCancel} → ${stockAfterCancel}`);

  await updateOrder(twinA.ok ? twinA.orderId : '', { status: '취소' });
  const stockAfterDoubleCancel = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;
  check(
    '같은 취소를 반복해도 재고가 더 늘지 않는다',
    stockAfterDoubleCancel === stockAfterCancel,
    `${stockAfterCancel} → ${stockAfterDoubleCancel}`,
  );

  await updateOrder(twinA.ok ? twinA.orderId : '', { status: '입금대기' });
  const stockAfterRevert = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;
  check(
    '취소를 되돌리면 재고가 다시 차감된다',
    stockAfterRevert === stockBeforeCancel,
    `${stockAfterCancel} → ${stockAfterRevert}`,
  );

  /* ────────────────────────────────────────────── */
  section('7. 관리자 수정 — 합계 자동 재계산');

  await updateOrder(created.orderId, {
    items: [{ productId: daeboMid.id, name: '대보 중', price: 30000, qty: 3, subtotal: 90000 }],
  });
  const edited = await getOrder(created.orderId);
  check('수량·가격을 고치면 합계가 다시 계산된다', edited?.totalAmount === 90000, `${edited?.totalAmount}`);

  /* ────────────────────────────────────────────── */
  section('8. 배송조회 — 정확 일치 + 취소/삭제 숨김');

  const found = await lookupOrders('홍길동', '01011112222');
  check('입금자명+전화가 맞으면 조회된다', found.length === 1, `${found.length}건`);
  check('하이픈 없는 전화번호도 동일하게 조회된다', found[0]?.id === created.orderId);

  const notFound = await lookupOrders('홍길동', '01099998888');
  check('전화번호가 다르면 조회되지 않는다', notFound.length === 0, `${notFound.length}건`);

  const cancelledLookup = await lookupOrders('김철수', '010-5555-6666');
  await updateOrder(twinA.ok ? twinA.orderId : '', { status: '취소' });
  const afterCancelLookup = await lookupOrders('김철수', '010-5555-6666');
  check(
    '취소된 주문은 배송조회에서 사라진다',
    cancelledLookup.length === 1 && afterCancelLookup.length === 0,
    `${cancelledLookup.length} → ${afterCancelLookup.length}`,
  );

  await updateOrder(twinB.ok ? twinB.orderId : '', { deleted: true });
  const afterDeleteLookup = await lookupOrders('김철수', '010-7777-8888');
  check('삭제된 주문도 배송조회에서 사라진다', afterDeleteLookup.length === 0);

  /* ────────────────────────────────────────────── */
  section('9. 삭제된 주문은 입금 매칭 후보에서 빠진다');

  const deletedOrder = await createOrder({
    lines: [{ productId: okgwangLarge.id, qty: 1 }],
    depositorName: '삭제대상',
    sameAsDepositor: true,
    recipient: { name: '삭제대상', phone: '010-2222-3333', address: '제주시 어딘가' },
  });
  if (deletedOrder.ok) await updateOrder(deletedOrder.orderId, { deleted: true });
  const matchDeleted = await recordDeposit({
    amount: okgwangLarge.price,
    depositorName: '삭제대상',
    bankName: '카카오뱅크',
  });
  check('삭제된 주문에는 입금이 붙지 않는다', matchDeleted.status === '미매칭', matchDeleted.message);

  /* ────────────────────────────────────────────── */
  section('10. 관리자 목록 조회');

  const pending = await listOrders({ status: '발송대기' });
  check('상태별 조회가 동작한다', pending.length >= 1, `${pending.length}건`);
  const all = await listOrders({});
  check('삭제된 주문은 기본 목록에서 빠진다', all.every((o) => !o.deleted));

  /* ────────────────────────────────────────────── */
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`통과 ${passed}건, 실패 ${failed}건`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n실행 중 오류:', err);
  process.exit(1);
});
