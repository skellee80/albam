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

/** 점검 시작 시 모든 상품 재고를 이 값으로 맞춘다. */
const SEED_STOCK = 50;

/** 점검에 쓰는 기준 상품 (시드가 넣는 이름) */
const DAEBO_MID_NAME = '대보 중 4kg';
const OKGWANG_LARGE_NAME = '옥광 특 4kg';

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
    products.map((p) => db.collection(COL.products).doc(p.id).update({ stock: SEED_STOCK })),
  );

  const daeboMid = products.find((p) => p.name === DAEBO_MID_NAME);
  const okgwangLarge = products.find((p) => p.name === OKGWANG_LARGE_NAME);
  if (!daeboMid || !okgwangLarge) {
    console.error(`상품 "${DAEBO_MID_NAME}" / "${OKGWANG_LARGE_NAME}" 이 없습니다.`);
    console.error('`npm run seed -- --replace` 로 상품을 새 이름 규칙으로 다시 넣으세요.');
    process.exit(1);
  }

  // 판매 계좌 은행 — 입금을 만들 때 이 값을 써야 은행 대조를 통과한다.
  // 설정에 무엇이 들어 있든 테스트가 깨지지 않도록 하드코딩하지 않는다.
  const { banksMatch } = await import('../src/lib/deposits');
  const { getSettings } = await import('../src/lib/settings');
  const accountBank = (await getSettings()).bankName;

  /* ────────────────────────────────────────────── */
  section('1. 주문 생성 — 서버 가격 재계산 / 재고 선점');

  const created = await createOrder({
    lines: [
      { productId: daeboMid.id, qty: 2 },
      { productId: okgwangLarge.id, qty: 1 },
    ],
    depositorName: '홍길동',
    sameAsDepositor: true,
    depositorPhone: '010-1234-5678',
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
    afterOrder.find((p) => p.id === daeboMid.id)!.stock === SEED_STOCK - 2,
  );

  // 같은 상품을 여러 줄로 보내도 합쳐져야 한다 (트랜잭션 중복 읽기 방지)
  const mergedOrder = await createOrder({
    lines: [
      { productId: daeboMid.id, qty: 1 },
      { productId: daeboMid.id, qty: 2 },
    ],
    depositorName: '중복상품',
    sameAsDepositor: true,
    depositorPhone: '010-1234-5678',
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
    depositorPhone: '010-1234-5678',
    recipient: { name: '과다주문', phone: '010-3333-4444', address: '대구시 어딘가' },
  });
  check('재고보다 많이 주문하면 거절된다', !overStock.ok, JSON.stringify(overStock));

  const noPhone = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '전화없음',
    sameAsDepositor: true,
    depositorPhone: '010-1234-5678',
    recipient: { name: '전화없음', phone: '123', address: '광주시 어딘가' },
  });
  check('전화번호가 부실하면 거절된다', !noPhone.ok);

  /* ────────────────────────────────────────────── */
  section('2. 입금 매칭 — 1건 확정');

  const exact = await recordDeposit({
    amount: expectedTotal,
    depositorName: '홍 길동', // 은행 문자에 공백이 섞여도 매칭되어야 한다
    bankName: accountBank,
  });
  check('금액·이름이 맞으면 확정된다', exact.status === '확정', exact.message);
  check('확정 응답에 상품 요약이 들어간다', exact.message.includes(DAEBO_MID_NAME), exact.message);
  check('확정 문구가 "발송확정" 이다', exact.message.startsWith('✅ 발송확정:'), exact.message);

  const confirmedOrder = await getOrder(created.orderId);
  check('주문이 발송대기로 넘어간다', confirmedOrder?.status === '발송대기', confirmedOrder?.status);
  check('입금 시각이 기록된다', typeof confirmedOrder?.paidAt === 'number');

  /* ────────────────────────────────────────────── */
  section('3. 입금 재전송 — 중복 방지');

  const again = await recordDeposit({
    amount: expectedTotal,
    depositorName: '홍 길동',
    bankName: accountBank,
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
    depositorPhone: '010-1234-5678',
    recipient: { name: '김철수', phone: '010-5555-6666', address: '인천시 어딘가' },
  });
  const twinB = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '김철수',
    sameAsDepositor: true,
    depositorPhone: '010-1234-5678',
    recipient: { name: '김철수', phone: '010-7777-8888', address: '수원시 어딘가' },
  });
  check('동명이인 주문 2건이 만들어진다', twinA.ok && twinB.ok);

  const ambiguous = await recordDeposit({
    amount: daeboMid.price,
    depositorName: '김철수',
    bankName: accountBank,
  });
  check('후보가 여러 건이면 확인필요가 된다', ambiguous.status === '확인필요', ambiguous.message);
  check('후보 건수가 문구에 들어간다', ambiguous.message.includes('2건'), ambiguous.message);

  /* ────────────────────────────────────────────── */
  section('5. 입금 매칭 — 금액이 다르면 미매칭');

  const wrongAmount = await recordDeposit({
    amount: 12345,
    depositorName: '박영희',
    bankName: accountBank,
  });
  check('이름도 금액도 다르면 미매칭이 된다', wrongAmount.status === '미매칭', wrongAmount.message);

  /* ────────────────────────────────────────────── */
  section('5-1. 한쪽만 맞아도 확인필요로 올린다');

  /*
    손님이 이름을 조금 다르게 적었거나(김철수 ↔ 김철수님) 금액을 잘못 보낸 경우가
    실제로 있다. 미매칭으로 묻어 두면 돈은 들어왔는데 아무도 모르는 상태가 된다.
    지금 입금대기 주문: 김철수 x2 (각 daeboMid.price)
  */
  const nameOnly = await recordDeposit({
    amount: daeboMid.price + 7,   // 금액은 어디에도 없는 값
    depositorName: '김철수',       // 이름은 맞다
    bankName: accountBank,
  });
  check('이름만 맞아도 확인필요', nameOnly.status === '확인필요', nameOnly.message);
  check(
    '문구가 한쪽만 맞았다고 알려준다',
    nameOnly.message.includes('이름 또는 금액만'),
    nameOnly.message,
  );

  const amountOnly = await recordDeposit({
    amount: daeboMid.price,        // 금액은 맞다
    depositorName: '전혀다른사람',   // 이름은 어디에도 없다
    bankName: accountBank,
  });
  check('금액만 맞아도 확인필요', amountOnly.status === '확인필요', amountOnly.message);

  // 확인필요는 폰으로도 알려야 한다 — 미매칭과 달리 사람이 손대야 하는 건이다
  check('확인필요는 응답 문구가 비어 있지 않다', amountOnly.message.trim().length > 0);

  // 한쪽만 맞은 건도 후보 주문을 달고 올라와야 관리자 화면에서 고를 수 있다
  const { listDeposits: allDeposits } = await import('../src/lib/deposits');
  const partialRecord = (await allDeposits(10)).find((d) => d.depositorName === '전혀다른사람');
  check(
    '후보 주문이 함께 담긴다',
    (partialRecord?.candidateOrderIds.length ?? 0) > 0,
    `${partialRecord?.candidateOrderIds.length ?? 0}건`,
  );

  // 정확히 맞는 주문이 있으면 예전처럼 곧바로 확정이다 (부분 매칭이 끼어들지 않는다)
  const stillExact = await recordDeposit({
    amount: daeboMid.price,
    depositorName: '김철수',
    bankName: accountBank,
  });
  check(
    '이름·금액이 둘 다 맞으면 부분 매칭이 끼어들지 않는다',
    stillExact.status === '확인필요' && stillExact.message.includes('후보 2건'),
    stillExact.message,
  );

  /*
    미매칭은 관리자 화면 **맨 위 빨간 영역에 올라오지 않는다.**
    아버지 개인 계좌라 가족 송금·다른 거래 문자가 섞여 들어오는데, 그것까지 위에
    쌓이면 정작 급한 확인필요가 묻힌다. 맨 아래 접이식 목록으로만 보인다.
  */
  const { listDepositsNeedingChoice, listUnmatchedDeposits } = await import(
    '../src/lib/deposits'
  );

  const needChoice = await listDepositsNeedingChoice();
  const unmatchedList = await listUnmatchedDeposits();

  check(
    '빨간 영역에는 확인필요만 올라온다',
    needChoice.every((d) => d.status === '확인필요'),
    needChoice.map((d) => d.status).join(', '),
  );
  check(
    '미매칭은 빨간 영역에 없다',
    needChoice.every((d) => d.status !== '미매칭'),
  );
  check(
    '미매칭은 아래 목록에 담긴다',
    unmatchedList.some((d) => d.depositorName === '박영희'),
    unmatchedList.map((d) => d.depositorName).join(', '),
  );
  check(
    '아래 목록은 최신순이다',
    unmatchedList.every((d, i) => i === 0 || unmatchedList[i - 1].receivedAt >= d.receivedAt),
  );

  /* ────────────────────────────────────────────── */
  section('6. 재고 복원 — 정확히 한 번만');

  const stockBeforeCancel = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;

  await updateOrder(twinA.ok ? twinA.orderId : '', { deleted: true });
  const stockAfterCancel = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;
  check('물러난 주문의 재고가 돌아온다', stockAfterCancel === stockBeforeCancel + 1, `${stockBeforeCancel} → ${stockAfterCancel}`);

  await updateOrder(twinA.ok ? twinA.orderId : '', { deleted: true });
  const stockAfterDoubleCancel = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;
  check(
    '같은 삭제를 반복해도 재고가 더 늘지 않는다',
    stockAfterDoubleCancel === stockAfterCancel,
    `${stockAfterCancel} → ${stockAfterDoubleCancel}`,
  );

  await updateOrder(twinA.ok ? twinA.orderId : '', { deleted: false });
  const stockAfterRevert = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;
  check(
    '되살리면 재고가 다시 차감된다',
    stockAfterRevert === stockBeforeCancel,
    `${stockAfterCancel} → ${stockAfterRevert}`,
  );

  /* ────────────────────────────────────────────── */
  section('7. 관리자 수정 — 합계 자동 재계산');

  await updateOrder(created.orderId, {
    items: [{ productId: daeboMid.id, name: DAEBO_MID_NAME, price: 30000, qty: 3, subtotal: 90000 }],
  });
  const edited = await getOrder(created.orderId);
  check('수량·가격을 고치면 합계가 다시 계산된다', edited?.totalAmount === 90000, `${edited?.totalAmount}`);

  /* ────────────────────────────────────────────── */
  section('8. 배송조회 — 정확 일치 + 취소/삭제 숨김');

  const found = await lookupOrders('홍길동', '01011112222');
  check('입금자명+전화가 맞으면 조회된다', found.length === 1, `${found.length}건`);
  check('하이픈 없는 전화번호도 동일하게 조회된다', found[0]?.id === created.orderId);

  const byDepositorPhone = await lookupOrders('홍길동', '010-1234-5678');
  check(
    '입금하신 분 연락처로도 조회된다',
    byDepositorPhone.some((o) => o.id === created.orderId),
    `${byDepositorPhone.length}건`,
  );

  const notFound = await lookupOrders('홍길동', '01099998888');
  check('전화번호가 다르면 조회되지 않는다', notFound.length === 0, `${notFound.length}건`);

  const cancelledLookup = await lookupOrders('김철수', '010-5555-6666');
  await updateOrder(twinA.ok ? twinA.orderId : '', { deleted: true });
  const afterCancelLookup = await lookupOrders('김철수', '010-5555-6666');
  check(
    '물러난 주문은 배송조회에서 사라진다',
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
    depositorPhone: '010-1234-5678',
    recipient: { name: '삭제대상', phone: '010-2222-3333', address: '제주시 어딘가' },
  });
  if (deletedOrder.ok) await updateOrder(deletedOrder.orderId, { deleted: true });
  const matchDeleted = await recordDeposit({
    amount: okgwangLarge.price,
    depositorName: '삭제대상',
    bankName: accountBank,
  });
  check('삭제된 주문에는 입금이 붙지 않는다', matchDeleted.status === '미매칭', matchDeleted.message);

  /* ────────────────────────────────────────────── */
  section('10. 관리자 목록 조회');

  const pending = await listOrders({ status: '발송대기' });
  check('상태별 조회가 동작한다', pending.length >= 1, `${pending.length}건`);
  const all = await listOrders({});
  check('삭제된 주문은 기본 목록에서 빠진다', all.every((o) => !o.deleted));

  /* ────────────────────────────────────────────── */
  section('11. 상품 이름이 손님 화면 표시의 단일 출처');

  const { updateProduct } = await import('../src/lib/products');
  const { parseProductName } = await import('../src/lib/format');

  check('"대보 중 4kg" → 품종·크기·무게로 나뉜다', (() => {
    const p = parseProductName('대보 중 4kg');
    return p.variety === '대보' && p.size === '중' && p.weight === '4kg';
  })());
  check('무게가 없어도 품종·크기는 나뉜다', (() => {
    const p = parseProductName('대보 중');
    return p.variety === '대보' && p.size === '중' && p.weight === '';
  })());
  check('무게만 있어도 품종은 나뉜다', (() => {
    const p = parseProductName('대보 10kg');
    return p.variety === '대보' && p.size === '' && p.weight === '10kg';
  })());
  check('알아보지 못하는 이름은 통째로 품종이 된다', (() => {
    const p = parseProductName('꿀밤 선물세트');
    return p.variety === '꿀밤 선물세트' && p.size === '' && p.weight === '';
  })());
  check('대문자 KG도 알아본다', parseProductName('대보 대 10KG').weight === '10kg');
  check('예전 표기 "특대"도 "특"으로 알아본다', (() => {
    const p = parseProductName('대보 특대 4kg');
    return p.variety === '대보' && p.size === '특' && p.weight === '4kg';
  })());

  await updateProduct(daeboMid.id, { name: '햇대보 특 10kg' });
  const renamed = (await listProducts()).find((p) => p.id === daeboMid.id)!;
  check('이름을 바꾸면 품종이 따라 바뀐다', renamed.variety === '햇대보', renamed.variety);
  check('이름을 바꾸면 크기도 따라 바뀐다', renamed.size === '특', renamed.size);
  check('이름을 바꾸면 무게도 따라 바뀐다', renamed.weight === '10kg', renamed.weight);

  await updateProduct(daeboMid.id, { name: DAEBO_MID_NAME }); // 원복

  section('12. 재고 알림은 매진만');

  const { isSoldOut } = await import('../src/lib/products');
  await updateProduct(okgwangLarge.id, { stock: 1 });
  const almost = (await listProducts()).find((p) => p.id === okgwangLarge.id)!;
  check('재고가 조금 남은 건 매진이 아니다', !isSoldOut(almost));

  await updateProduct(okgwangLarge.id, { stock: 0 });
  const empty = (await listProducts()).find((p) => p.id === okgwangLarge.id)!;
  check('재고가 0이면 매진이다', isSoldOut(empty));

  const soldOutOrder = await createOrder({
    lines: [{ productId: okgwangLarge.id, qty: 1 }],
    depositorName: '매진주문',
    sameAsDepositor: true,
    depositorPhone: '010-1234-5678',
    recipient: { name: '매진주문', phone: '010-8888-9999', address: '울산시 어딘가' },
  });
  check('매진 상품은 주문이 거절된다', !soldOutOrder.ok, JSON.stringify(soldOutOrder));

  await updateProduct(okgwangLarge.id, { stock: SEED_STOCK }); // 점검 뒤 재고 원복

  section('13. 입금자 연락처 검증');

  const noDepositorPhone = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '연락처없음',
    sameAsDepositor: false,
    depositorPhone: '',
    recipient: { name: '받는분', phone: '010-1111-0000', address: '세종시 어딘가' },
  });
  check('입금자 연락처가 없으면 거절된다', !noDepositorPhone.ok, JSON.stringify(noDepositorPhone));

  const withDepositorPhone = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '연락처있음',
    sameAsDepositor: false,
    depositorPhone: '010-5252-5252',
    recipient: { name: '다른받는분', phone: '010-7070-7070', address: '천안시 어딘가' },
  });
  check('입금자와 받는 분이 달라도 주문된다', withDepositorPhone.ok);
  if (withDepositorPhone.ok) {
    const saved = await getOrder(withDepositorPhone.orderId);
    check('입금자 연락처가 저장된다', saved?.depositorPhone === '010-5252-5252', saved?.depositorPhone);
    const foundByDep = await lookupOrders('연락처있음', '01052525252');
    check('입금자 연락처로 조회된다', foundByDep.length === 1, `${foundByDep.length}건`);
    const foundByRec = await lookupOrders('연락처있음', '01070707070');
    check('받는 분 연락처로도 조회된다', foundByRec.length === 1, `${foundByRec.length}건`);
  }

  /* ────────────────────────────────────────────── */
  section('15. 입금 기한이 지나면 자동 취소 + 재고 복원');

  const { expireStaleOrders } = await import('../src/lib/orders');
  const { PAYMENT_DEADLINE_MS } = await import('../src/lib/types');

  const stockBeforeExpire = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;

  const stale = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 2 }],
    depositorName: '기한지남',
    sameAsDepositor: true,
    depositorPhone: '010-1234-5678',
    recipient: { name: '기한지남', phone: '010-4444-5555', address: '강릉시 어딘가' },
  });
  const fresh = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '방금주문',
    sameAsDepositor: true,
    depositorPhone: '010-1234-5678',
    recipient: { name: '방금주문', phone: '010-6666-7777', address: '속초시 어딘가' },
  });
  check('점검용 주문 2건이 만들어진다', stale.ok && fresh.ok);
  if (!stale.ok || !fresh.ok) throw new Error('이후 검증 불가');

  const stockAfterOrders = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;
  check('주문으로 재고 3개가 빠진다', stockAfterOrders === stockBeforeExpire - 3, `${stockAfterOrders}`);

  check(
    '입금 마감 시각을 알려준다 (주문 + PAYMENT_DEADLINE_HOURS)',
    Math.abs(stale.paymentDueAt - (Date.now() + PAYMENT_DEADLINE_MS)) < 60_000,
  );

  // 한 건만 입금 기한이 1분 전에 지난 것처럼 되돌린다
  await db
    .collection(COL.orders)
    .doc(stale.orderId)
    .update({
      createdAt: Date.now() - PAYMENT_DEADLINE_MS - 60_000,
      paymentDueAt: Date.now() - 60_000,
    });

  const cancelledCount = await expireStaleOrders({ force: true });
  check('기한 지난 주문만 정리된다', cancelledCount === 1, `${cancelledCount}건`);

  const staleAfter = await getOrder(stale.orderId);
  const freshAfter = await getOrder(fresh.orderId);
  check('기한 지난 주문이 삭제된다', staleAfter?.deleted === true, String(staleAfter?.deleted));
  check('상태는 입금대기 그대로다 (취소 상태는 없앴다)', staleAfter?.status === '입금대기', staleAfter?.status);
  check('방금 들어온 주문은 그대로 입금대기다', freshAfter?.status === '입금대기', freshAfter?.status);
  check(
    '자동 취소 사유가 메모에 남는다',
    (staleAfter?.memo ?? '').includes('자동으로 취소'),
    staleAfter?.memo,
  );

  const stockAfterExpire = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;
  check(
    '취소된 수량 2개가 재고로 돌아온다',
    stockAfterExpire === stockBeforeExpire - 1,
    `${stockAfterOrders} → ${stockAfterExpire}`,
  );

  const secondSweep = await expireStaleOrders({ force: true });
  const stockAfterSecond = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;
  check('다시 돌려도 또 취소하지 않는다', secondSweep === 0, `${secondSweep}건`);
  check('재고가 더 늘지 않는다', stockAfterSecond === stockAfterExpire, `${stockAfterSecond}`);

  const autoCancelled = await lookupOrders('기한지남', '010-4444-5555');
  check('자동 취소된 주문은 배송조회에서 사라진다', autoCancelled.length === 0);


  section('16. 상태를 되돌리면 진행 시각도 함께 지워진다');

  const revertOrder = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '되돌리기',
    sameAsDepositor: true,
    depositorPhone: '010-1234-5678',
    recipient: { name: '되돌리기', phone: '010-9090-8080', address: '전주시 어딘가' },
  });
  if (!revertOrder.ok) throw new Error('점검용 주문 생성 실패');

  await updateOrder(revertOrder.orderId, { status: '발송완료', trackingNo: '123456789' });
  const shipped = await getOrder(revertOrder.orderId);
  check('발송완료로 올리면 입금·발송 시각이 찍힌다', !!shipped?.paidAt && !!shipped?.shippedAt);

  await updateOrder(revertOrder.orderId, { status: '발송대기' });
  const backToReady = await getOrder(revertOrder.orderId);
  check('발송대기로 되돌리면 발송 시각이 지워진다', backToReady?.shippedAt === null, `${backToReady?.shippedAt}`);
  check('입금 시각은 남는다', !!backToReady?.paidAt);

  await updateOrder(revertOrder.orderId, { status: '입금대기' });
  const backToPending = await getOrder(revertOrder.orderId);
  check(
    '입금대기로 되돌리면 입금 시각이 지워진다',
    backToPending?.paidAt === null,
    `${backToPending?.paidAt}`,
  );
  check('발송 시각도 지워진 채로 남는다', backToPending?.shippedAt === null);

  // 배송조회 화면은 이 시각들로 진행 단계를 그린다.
  // paidAt이 남아 있으면 되돌렸는데도 손님 화면에 "입금 확인"으로 보인다.
  const trackedAfterRevert = await lookupOrders('되돌리기', '010-9090-8080');
  check(
    '배송조회에도 입금 확인이 사라진다',
    trackedAfterRevert[0]?.paidAt === null,
    `${trackedAfterRevert[0]?.paidAt}`,
  );

  section('17. 주문은 건마다 따로 입금받는다 — 합산 입금은 확인되지 않는다');

  const twoOrdersA = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '두건주문',
    sameAsDepositor: true,
    depositorPhone: '010-6161-6161',
    recipient: { name: '두건주문', phone: '010-6161-6161', address: '평창군 어딘가' },
  });
  const twoOrdersB = await createOrder({
    lines: [{ productId: okgwangLarge.id, qty: 1 }],
    depositorName: '두건주문',
    sameAsDepositor: true,
    depositorPhone: '010-6161-6161',
    recipient: { name: '두건주문', phone: '010-6161-6161', address: '평창군 어딘가' },
  });
  check('같은 사람이 두 건을 주문해도 각각 남는다', twoOrdersA.ok && twoOrdersB.ok);
  if (!twoOrdersA.ok || !twoOrdersB.ok) throw new Error('이후 검증 불가');
  check('두 주문이 합쳐지지 않는다', twoOrdersA.orderId !== twoOrdersB.orderId);

  /*
    합산 금액을 한 번에 보내면 어느 주문과도 금액이 맞지 않는다.
    이름은 맞으므로 **확인필요**로 올라간다(한쪽만 맞아도 사람이 보게 하는 규칙).
    여기서 지켜야 하는 것은 "어느 주문도 저절로 발송대기가 되지 않는다" 이다 —
    두 건 값을 한 번에 받았는데 한 건만 확정되면 나머지 한 건을 그냥 부치게 된다.
  */
  const lumpSum = await recordDeposit({
    amount: twoOrdersA.totalAmount + twoOrdersB.totalAmount,
    depositorName: '두건주문',
    bankName: accountBank,
  });
  check('합산 입금은 자동 확정되지 않는다', lumpSum.status !== '확정', lumpSum.message);
  check('합산 입금은 확인필요로 올라온다', lumpSum.status === '확인필요', lumpSum.message);

  const lumpA = await getOrder(twoOrdersA.orderId);
  const lumpB = await getOrder(twoOrdersB.orderId);
  check(
    '두 주문 다 입금대기 그대로다',
    lumpA?.status === '입금대기' && lumpB?.status === '입금대기',
    `${lumpA?.status} / ${lumpB?.status}`,
  );

  const stillA = await getOrder(twoOrdersA.orderId);
  const stillB = await getOrder(twoOrdersB.orderId);
  check(
    '두 주문 모두 입금대기로 남는다',
    stillA?.status === '입금대기' && stillB?.status === '입금대기',
    `${stillA?.status} / ${stillB?.status}`,
  );

  // 각 금액으로 따로 보내면 각각 확정된다
  const payA = await recordDeposit({
    amount: twoOrdersA.totalAmount,
    depositorName: '두건주문',
    bankName: accountBank,
  });
  check('첫 주문 금액으로 보내면 확정된다', payA.status === '확정', payA.message);

  const payB = await recordDeposit({
    amount: twoOrdersB.totalAmount,
    depositorName: '두건주문',
    bankName: accountBank,
  });
  check('둘째 주문 금액으로 보내면 확정된다', payB.status === '확정', payB.message);

  const doneA = await getOrder(twoOrdersA.orderId);
  const doneB = await getOrder(twoOrdersB.orderId);
  check(
    '두 주문이 각각 발송대기로 올라간다',
    doneA?.status === '발송대기' && doneB?.status === '발송대기',
    `${doneA?.status} / ${doneB?.status}`,
  );

  section('17-1. 손님이 스스로 주문 취소 — 남의 주문은 못 건드린다');

  const { cancelOwnOrder } = await import('../src/app/(shop)/track/actions');

  const mine = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '내주문',
    sameAsDepositor: true,
    depositorPhone: '010-3434-3434',
    recipient: { name: '내주문', phone: '010-3434-3434', address: '평택시 어딘가' },
  });
  if (!mine.ok) throw new Error('점검용 주문 생성 실패');

  const stockBeforeSelfCancel = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;

  const wrongOwner = await cancelOwnOrder(mine.orderId, '내주문', '010-0000-0000');
  check('연락처가 다르면 취소할 수 없다', !wrongOwner.ok, JSON.stringify(wrongOwner));
  const wrongName = await cancelOwnOrder(mine.orderId, '남의이름', '010-3434-3434');
  check('이름이 다르면 취소할 수 없다', !wrongName.ok, JSON.stringify(wrongName));

  const stillThere = await getOrder(mine.orderId);
  check('막힌 요청은 주문을 건드리지 않는다', stillThere?.status === '입금대기', stillThere?.status);

  const selfCancel = await cancelOwnOrder(mine.orderId, '내주문', '010-3434-3434');
  check('본인이면 취소된다', selfCancel.ok, JSON.stringify(selfCancel));
  const cancelled = await getOrder(mine.orderId);
  check('주문이 삭제된다', cancelled?.deleted === true, String(cancelled?.deleted));

  const stockAfterSelfCancel = (await listProducts()).find((p) => p.id === daeboMid.id)!.stock;
  check(
    '취소한 수량이 재고로 돌아온다',
    stockAfterSelfCancel === stockBeforeSelfCancel + 1,
    `${stockBeforeSelfCancel} → ${stockAfterSelfCancel}`,
  );

  // 입금이 끝난 주문은 환불이 얽히므로 손님이 스스로 못 지운다
  const paidOne = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '입금끝',
    sameAsDepositor: true,
    depositorPhone: '010-5656-5656',
    recipient: { name: '입금끝', phone: '010-5656-5656', address: '이천시 어딘가' },
  });
  if (!paidOne.ok) throw new Error('점검용 주문 생성 실패');
  await updateOrder(paidOne.orderId, { status: '발송대기' });

  const afterPaid = await cancelOwnOrder(paidOne.orderId, '입금끝', '010-5656-5656');
  check('입금 확인된 주문은 스스로 취소할 수 없다', !afterPaid.ok, JSON.stringify(afterPaid));

  section('17-2. 문자 원문을 서버가 해석한다');

  const { parseDepositSms } = await import('../src/lib/sms');
  const { recordUnparsedDeposit } = await import('../src/lib/deposits');

  const smsOrder = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '문자해석',
    sameAsDepositor: true,
    depositorPhone: '010-7373-7373',
    recipient: { name: '문자해석', phone: '010-7373-7373', address: '공주시 어딘가' },
  });
  if (!smsOrder.ok) throw new Error('점검용 주문 생성 실패');

  const sms = `<${accountBank}>382710**5 문자해석 입금${smsOrder.totalAmount.toLocaleString('ko-KR')} 잔액1,600,000원 07/26 21:58`;
  const parsed = parseDepositSms(sms);
  check('문자에서 금액을 뽑는다', parsed.ok && parsed.amount === smsOrder.totalAmount, JSON.stringify(parsed));
  check('문자에서 이름을 뽑는다', parsed.ok && parsed.depositorName === '문자해석');
  check('문자에서 은행을 알아본다', parsed.ok && parsed.bankName === accountBank);

  // 출금 문자가 입금으로 처리되면 돈을 받지 않은 주문이 발송대기로 올라간다
  const withdrawal = parseDepositSms('<농협>382710**5 출금50,000 잔액1,000,000원');
  check('출금 문자는 해석하지 않는다', !withdrawal.ok, JSON.stringify(withdrawal));

  if (parsed.ok) {
    const viaSms = await recordDeposit({
      amount: parsed.amount,
      depositorName: parsed.depositorName,
      bankName: parsed.bankName,
      rawText: sms,
    });
    check('해석한 값으로 주문이 확정된다', viaSms.status === '확정', viaSms.message);

    const confirmed = (await db.collection(COL.deposits).doc(viaSms.depositId!).get()).data()!;
    check(
      '확정된 건에는 원문을 남기지 않는다 (계좌번호·잔액)',
      !confirmed.rawText,
      JSON.stringify(confirmed.rawText),
    );
  }

  // 해석 실패도 흔적을 남겨야 나중에 규칙을 고칠 수 있다
  const brokenSms = '[Web발신] 이번달 청구금액 33,000원';
  await recordUnparsedDeposit(brokenSms, '입금 문자가 아닙니다.');
  const unparsed = (await db.collection(COL.deposits).get()).docs
    .map((d) => d.data())
    .find((d) => d.rawText === brokenSms);
  check('해석 실패한 문자도 기록에 남는다', !!unparsed, '기록 없음');
  check('실패 기록은 미매칭으로 남는다', unparsed?.status === '미매칭', unparsed?.status);

  section('18. 은행 대조 — 판매 계좌가 아닌 은행 입금은 매칭하지 않는다');

  check('표기가 달라도 같은 은행으로 본다', banksMatch('NH농협은행', '농협'));
  check('"농협 은행"도 같게 본다', banksMatch('농협 은행', '농협'));
  check('다른 은행은 구분한다', !banksMatch('국민', '농협'));
  check('설정이 비어 있으면 막지 않는다', banksMatch('국민', ''));

  const bankOrder = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '은행대조',
    sameAsDepositor: true,
    depositorPhone: '010-1234-5678',
    recipient: { name: '은행대조', phone: '010-3131-4141', address: '청주시 어딘가' },
  });
  if (!bankOrder.ok) throw new Error('점검용 주문 생성 실패');

  const wrongBank = await recordDeposit({
    amount: bankOrder.totalAmount,
    depositorName: '은행대조',
    bankName: '없는은행',
  });
  check('다른 은행 입금은 확정되지 않는다', wrongBank.status === '미매칭', wrongBank.message);
  check('문구가 은행 때문임을 알려준다', wrongBank.message.includes('없는은행'), wrongBank.message);

  const stillWaiting = await getOrder(bankOrder.orderId);
  check('주문은 입금대기로 남는다', stillWaiting?.status === '입금대기', stillWaiting?.status);

  const rightBank = await recordDeposit({
    amount: bankOrder.totalAmount,
    depositorName: '은행대조',
    bankName: accountBank,
  });
  check('같은 은행 입금은 확정된다', rightBank.status === '확정', rightBank.message);

  section('19. 입금 미리보기 — 판정은 같고 아무것도 바꾸지 않는다');

  const { previewDeposit } = await import('../src/lib/deposits');

  const previewTarget = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '미리보기',
    sameAsDepositor: true,
    depositorPhone: '010-1234-5678',
    recipient: { name: '미리보기', phone: '010-1212-3434', address: '원주시 어딘가' },
  });
  if (!previewTarget.ok) throw new Error('점검용 주문 생성 실패');

  const depositCountBefore = (await db.collection(COL.deposits).get()).size;
  const pv = await previewDeposit({
    amount: previewTarget.totalAmount,
    depositorName: '미리보기',
    bankName: accountBank,
  });
  check('맞는 주문이 있으면 확정으로 예고한다', pv.status === '확정', pv.message);
  check('맞아떨어진 주문을 알려준다', pv.candidates.length === 1, `${pv.candidates.length}건`);

  const stillPending = await getOrder(previewTarget.orderId);
  check('미리보기는 주문 상태를 바꾸지 않는다', stillPending?.status === '입금대기', stillPending?.status);
  const depositCountAfter = (await db.collection(COL.deposits).get()).size;
  check('미리보기는 입금 기록을 남기지 않는다', depositCountAfter === depositCountBefore);

  const pvMiss = await previewDeposit({ amount: 13, depositorName: '없는사람', bankName: accountBank });
  check('맞는 주문이 없으면 미매칭으로 예고한다', pvMiss.status === '미매칭', pvMiss.message);

  // 미리보기와 실제 처리의 문구가 같아야 테스트가 의미를 갖는다
  const real = await recordDeposit({
    amount: previewTarget.totalAmount,
    depositorName: '미리보기',
    bankName: accountBank,
  });
  check('미리보기 문구가 실제 처리 문구와 같다', pv.message === real.message, `${pv.message} / ${real.message}`);

  const nowShipping = await getOrder(previewTarget.orderId);
  check('실제 처리는 주문 상태를 바꾼다', nowShipping?.status === '발송대기', nowShipping?.status);

  section('20. 재고 안내는 10개 이하일 때만 숫자를 보여준다');

  const { stockNotice, LOW_STOCK_NOTICE_THRESHOLD } = await import('../src/lib/types');

  check('기준값은 10개', LOW_STOCK_NOTICE_THRESHOLD === 10, `${LOW_STOCK_NOTICE_THRESHOLD}`);
  check('재고가 넉넉하면 숫자를 감춘다', stockNotice(11) === '주문 가능', stockNotice(11));
  check('딱 10개면 숫자를 보여준다', stockNotice(10) === '10개 남았습니다', stockNotice(10));
  check('3개 남으면 숫자를 보여준다', stockNotice(3) === '3개 남았습니다', stockNotice(3));
  check('1개 남아도 주문할 수 있다', stockNotice(1) === '1개 남았습니다', stockNotice(1));
  check('0개면 품절 안내', stockNotice(0) === '지금은 준비된 물량이 없습니다', stockNotice(0));

  section('21. 환불요청·교환요청 상태는 없다');

  const { ORDER_STATUSES: statuses } = await import('../src/lib/types');
  check('환불요청이 상태 목록에 없다', !(statuses as readonly string[]).includes('환불요청'));
  check('교환요청이 상태 목록에 없다', !(statuses as readonly string[]).includes('교환요청'));
  check('환불완료는 남아 있다', (statuses as readonly string[]).includes('환불완료'));
  check('교환완료는 남아 있다', (statuses as readonly string[]).includes('교환완료'));

  /* ────────────────────────────────────────────── */
  section('22. 날짜·금액 형식이 실행 환경에 좌우되지 않는가');

  // 서버(Node)와 브라우저의 ICU 데이터가 달라 ko-KR 오전/오후가 "PM"으로 나오는 바람에
  // 하이드레이션이 깨진 적이 있다. 고정 시각으로 결과를 못 박아 재발을 잡는다.
  const { formatDate, formatDateTime, formatShortDateTime, kstDateKey, kstDayLabel, formatKRW } =
    await import('../src/lib/format');

  const evening = Date.UTC(2026, 6, 26, 9, 52); // KST 2026-07-26 18:52
  check('연월일', formatDate(evening) === '2026년 7월 26일', formatDate(evening));
  check(
    '연월일 + 오후 시각',
    formatDateTime(evening) === '2026년 7월 26일 오후 6:52',
    formatDateTime(evening),
  );
  check(
    '짧은 날짜시각',
    formatShortDateTime(evening) === '7월 26일 오후 6:52',
    formatShortDateTime(evening),
  );
  check('날짜 키', kstDateKey(evening) === '20260726', kstDateKey(evening));
  check('차트 축 라벨', kstDayLabel(evening) === '7.26', kstDayLabel(evening));

  // 자정과 정오는 12시간제에서 틀리기 쉬운 자리다
  const midnightKst = Date.UTC(2026, 0, 1, 15, 0); // KST 2026-01-02 00:00
  check(
    '자정은 오전 12시이고 날짜가 넘어간다',
    formatDateTime(midnightKst) === '2026년 1월 2일 오전 12:00',
    formatDateTime(midnightKst),
  );
  check('자정의 날짜 키도 넘어간다', kstDateKey(midnightKst) === '20260102', kstDateKey(midnightKst));

  const noonKst = Date.UTC(2026, 6, 26, 3, 0); // KST 12:00
  check('정오는 오후 12시', formatShortDateTime(noonKst) === '7월 26일 오후 12:00', formatShortDateTime(noonKst));

  check('금액에 천 단위 쉼표', formatKRW(1234567) === '1,234,567원', formatKRW(1234567));
  check('세 자리 이하는 쉼표 없음', formatKRW(999) === '999원', formatKRW(999));
  check('0원', formatKRW(0) === '0원', formatKRW(0));

  /* ────────────────────────────────────────────── */
  section('22-1. 주문 상태 색이 서로 구별되는가');

  // 상태를 새로 추가하고 색을 빠뜨리면 목록에서 전부 회색으로 보인다.
  const { ORDER_STATUS_TONE } = await import('../src/lib/status-tone');
  const { ORDER_STATUSES: allStatuses } = await import('../src/lib/types');

  const missingTone = allStatuses.filter((s) => !ORDER_STATUS_TONE[s]);
  check('모든 상태에 색이 있다', missingTone.length === 0, missingTone.join(', '));

  const tones = allStatuses.map((s) => ORDER_STATUS_TONE[s]);
  check('상태마다 색이 다르다', new Set(tones).size === tones.length);

  // 예전에 이 둘이 둘 다 연한 따뜻한 색이라 나란히 놓으면 구별이 안 됐다
  check(
    '입금대기와 발송완료가 확실히 다르다',
    ORDER_STATUS_TONE['입금대기'] !== ORDER_STATUS_TONE['발송완료'],
  );

  /* ────────────────────────────────────────────── */
  section('22-3. 취소 상태는 없다 — 물러난 주문은 삭제로만 다룬다');

  const { ORDER_STATUSES: statusList, STOCK_RELEASING_STATUSES: releasing } = await import(
    '../src/lib/types'
  );

  check(
    '상태 목록에 취소가 없다',
    !(statusList as readonly string[]).includes('취소'),
    statusList.join(', '),
  );
  check(
    '재고를 놓아주는 상태에도 취소가 없다',
    !(releasing as readonly string[]).includes('취소'),
    releasing.join(', '),
  );
  check('환불완료는 여전히 재고를 놓아준다', (releasing as readonly string[]).includes('환불완료'));

  // 예전 문서에 남아 있는 '취소' 는 삭제된 것으로 읽어야 한다.
  // 안 그러면 상태 목록에 없는 값이 화면에 떠서 저장할 때 엉뚱하게 바뀐다.
  const legacy = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '옛취소',
    sameAsDepositor: true,
    depositorPhone: '010-1212-3434',
    recipient: { name: '옛취소', phone: '010-1212-3434', address: '청주시 어딘가' },
  });
  if (!legacy.ok) throw new Error('이후 검증 불가');
  await db.collection(COL.orders).doc(legacy.orderId).update({ status: '취소', deleted: false });

  const legacyRead = await getOrder(legacy.orderId);
  check('예전 취소 주문은 삭제된 것으로 읽힌다', legacyRead?.deleted === true, String(legacyRead?.deleted));
  check('상태는 목록에 있는 값으로 바뀐다', legacyRead?.status === '입금대기', legacyRead?.status);

  const legacyLookup = await lookupOrders('옛취소', '010-1212-3434');
  check('예전 취소 주문도 배송조회에서 안 보인다', legacyLookup.length === 0, `${legacyLookup.length}건`);

  /* ────────────────────────────────────────────── */
  section('22-2. 입금 기한');

  const { PAYMENT_DEADLINE_HOURS: hours, PAYMENT_DEADLINE_MS: ms } = await import(
    '../src/lib/types'
  );
  check(`기한이 ${hours}시간이다`, hours === 1, `${hours}시간`);
  check('시간과 밀리초가 어긋나지 않는다', ms === hours * 60 * 60 * 1000);

  /* ────────────────────────────────────────────── */
  section('22-4. 직접 넣은 주문 (전화·방문 판매)');

  const { dailySales: daily, productSales: byProduct } = await import('../src/lib/stats');

  const stockBeforeDirect = (await listProducts()).find((p) => p.id === okgwangLarge.id)!.stock;

  // 방문 판매: 주소도 연락처도 없이 이름만 있다
  const direct = await createOrder({
    lines: [{ productId: okgwangLarge.id, qty: 2 }],
    source: 'direct',
    paid: true,
    depositorName: '장터손님',
    depositorPhone: '',
    sameAsDepositor: true,
    recipient: { name: '장터손님', phone: '', address: '' },
  });
  check('주소·연락처가 없어도 넣을 수 있다', direct.ok, JSON.stringify(direct));
  if (!direct.ok) throw new Error('이후 검증 불가');

  const directOrder = await getOrder(direct.orderId);
  check('직접 넣은 주문으로 표시된다', directOrder?.source === 'direct', directOrder?.source);
  check('이미 받았으면 발송대기로 시작한다', directOrder?.status === '발송대기', directOrder?.status);
  check('입금 시각이 찍혀 매출에 잡힌다', directOrder?.paidAt !== null);

  const stockAfterDirect = (await listProducts()).find((p) => p.id === okgwangLarge.id)!.stock;
  check(
    '직접 넣은 주문도 재고에서 빠진다',
    stockAfterDirect === stockBeforeDirect - 2,
    `${stockBeforeDirect} → ${stockAfterDirect}`,
  );

  // 재고보다 많이 넣으려 하면 막고, 얼마나 모자란지 알려준다
  const tooMany = await createOrder({
    lines: [{ productId: okgwangLarge.id, qty: stockAfterDirect + 5 }],
    source: 'direct',
    paid: true,
    depositorName: '과다',
    depositorPhone: '',
    sameAsDepositor: true,
    recipient: { name: '과다', phone: '', address: '' },
  });
  check('재고보다 많이 넣으면 막힌다', !tooMany.ok);
  check(
    '얼마나 모자란지 함께 돌려준다',
    !tooMany.ok && tooMany.shortage?.stock === stockAfterDirect,
    JSON.stringify(!tooMany.ok ? tooMany.shortage : null),
  );

  // 안 받았다고 하면 입금대기로 들어간다
  const unpaidDirect = await createOrder({
    lines: [{ productId: okgwangLarge.id, qty: 1 }],
    source: 'direct',
    paid: false,
    depositorName: '나중결제',
    depositorPhone: '',
    sameAsDepositor: true,
    recipient: { name: '나중결제', phone: '', address: '' },
  });
  const unpaidOrder = unpaidDirect.ok ? await getOrder(unpaidDirect.orderId) : null;
  check('아직 안 받았으면 입금대기로 들어간다', unpaidOrder?.status === '입금대기', unpaidOrder?.status);

  /*
    단가 조절 — 직접 넣는 주문에서만 열려 있어야 한다.
    이 사이트의 핵심 방어가 "서버가 가격을 다시 계산한다"이므로,
    그 예외가 손님 쪽으로 새지 않는지 여기서 못박는다.
  */
  const cheap = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 2, price: 1000 }],
    source: 'direct',
    paid: true,
    depositorName: '깎아줌',
    depositorPhone: '',
    sameAsDepositor: true,
    recipient: { name: '깎아줌', phone: '', address: '' },
  });
  check('직접 주문은 적어 넣은 단가를 쓴다', cheap.ok && cheap.totalAmount === 2000, JSON.stringify(cheap));
  check(
    '주문 품목에도 그 단가가 남는다',
    cheap.ok && cheap.items[0].price === 1000 && cheap.items[0].subtotal === 2000,
  );

  const forged = await createOrder({
    // 손님 화면에서는 가격을 보내지 않지만, 보내더라도 서버가 버려야 한다
    lines: [{ productId: daeboMid.id, qty: 1, price: 10 }],
    depositorName: '가격조작',
    sameAsDepositor: true,
    depositorPhone: '010-2222-3333',
    recipient: { name: '가격조작', phone: '010-2222-3333', address: '서울시 어딘가' },
  });
  check(
    '손님 주문에서 보낸 단가는 버려진다',
    forged.ok && forged.totalAmount === daeboMid.price,
    forged.ok ? `${forged.totalAmount} (정가 ${daeboMid.price})` : JSON.stringify(forged),
  );

  // 인터넷 주문은 예전 그대로여야 한다
  const online = await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '인터넷손님',
    sameAsDepositor: true,
    depositorPhone: '010-2222-3333',
    recipient: { name: '인터넷손님', phone: '010-2222-3333', address: '천안시 어딘가' },
  });
  const onlineOrder = online.ok ? await getOrder(online.orderId) : null;
  check('사이트 주문은 인터넷으로 잡힌다', onlineOrder?.source === 'online', onlineOrder?.source);
  check('사이트 주문은 여전히 주소를 요구한다', !(await createOrder({
    lines: [{ productId: daeboMid.id, qty: 1 }],
    depositorName: '주소없음',
    sameAsDepositor: true,
    depositorPhone: '010-2222-3333',
    recipient: { name: '주소없음', phone: '010-2222-3333', address: '' },
  })).ok);

  const allOrders = await listOrders({ limit: 1000 });

  const todayRow = daily(allOrders, 7).at(-1)!;
  check(
    '일별 매출도 둘로 나뉜다',
    todayRow.online + todayRow.direct === todayRow.amount,
    `${todayRow.online} + ${todayRow.direct} vs ${todayRow.amount}`,
  );

  // 상품별 판매는 금액이 큰 순으로 줄 세운다 (개수 순이 아니다)
  const ranked = byProduct(allOrders);
  check(
    '상품별 판매가 금액 큰 순이다',
    ranked.every((r, i) => i === 0 || ranked[i - 1].amount >= r.amount),
    ranked.map((r) => `${r.name} ${r.amount}`).join(' / '),
  );
  check(
    '상품별 판매도 인터넷과 직접으로 나뉜다',
    ranked.every((r) => r.online + r.direct === r.amount),
    ranked.map((r) => `${r.name} ${r.online}+${r.direct}=${r.amount}`).join(' / '),
  );
  // 상품별로 나눈 직접 판매액의 합이 직접 주문 총액과 맞아야 한다.
  // (한 상품이 인터넷과 직접 양쪽으로 팔릴 수 있어 상품 하나만 봐서는 알 수 없다)
  const directFromProducts = ranked.reduce((sum, r) => sum + r.direct, 0);
  const directFromOrders = allOrders
    .filter((o) => o.source === 'direct' && !o.deleted && o.paidAt !== null && o.status !== '환불완료')
    .reduce((sum, o) => sum + o.totalAmount, 0);
  check(
    '상품별 직접 판매액의 합이 직접 주문 총액과 같다',
    directFromProducts > 0 && directFromProducts === directFromOrders,
    `상품 합 ${directFromProducts} / 주문 합 ${directFromOrders}`,
  );

  /* ────────────────────────────────────────────── */
  section('22-5. 사진은 그룹 단위로 걸린다');

  const { setGroupImage } = await import('../src/lib/products');

  const beforeGroupImage = await listProducts({ includeHidden: true });
  const daeboItems = beforeGroupImage.filter((p) => p.variety === '대보');
  check('대보 그룹에 상품이 여러 개다', daeboItems.length > 1, `${daeboItems.length}가지`);

  const changed = await setGroupImage('대보', '/products/시험.jpg');
  check('그룹 상품 전체가 한 번에 바뀐다', changed === daeboItems.length, `${changed}개`);

  const afterGroup = await listProducts({ includeHidden: true });
  check(
    '대보 상품이 모두 같은 사진을 가리킨다',
    afterGroup
      .filter((p) => p.variety === '대보')
      .every((p) => p.imageUrl === '/products/시험.jpg'),
  );
  check(
    '다른 그룹은 건드리지 않는다',
    afterGroup
      .filter((p) => p.variety !== '대보')
      .every((p) => p.imageUrl !== '/products/시험.jpg'),
  );

  const none = await setGroupImage('없는그룹', '/products/시험.jpg');
  check('없는 그룹이면 아무것도 바꾸지 않는다', none === 0, `${none}개`);

  /* ────────────────────────────────────────────── */
  section('22-7. 순서 — 그룹이 먼저, 그 안의 상품이 그다음');

  const { setGroupPosition, setProductPosition, compareProducts } = await import(
    '../src/lib/products'
  );

  /** 지금 손님 화면에 보이는 차례대로 그룹 이름을 늘어놓는다 */
  async function groupOrderNow(): Promise<string[]> {
    const list = (await listProducts({ includeHidden: true })).slice().sort(compareProducts);
    const seen: string[] = [];
    for (const p of list) {
      const g = p.variety || p.name;
      if (!seen.includes(g)) seen.push(g);
    }
    return seen;
  }

  const startOrder = await groupOrderNow();
  check('처음 차례가 시드 순서다', startOrder.join(' ') === '대보 포르단 옥광', startOrder.join(' '));

  // 그룹을 다른 자리로 보내면 그 그룹 상품이 통째로 따라가야 한다
  const daeboBefore = (await listProducts({ includeHidden: true })).filter(
    (p) => p.variety === '대보',
  );
  await setGroupPosition('대보', 2); // 1번 → 2번

  const afterMove = await groupOrderNow();
  check('그룹을 2번으로 보내면 차례가 바뀐다', afterMove.join(' ') === '포르단 대보 옥광', afterMove.join(' '));

  const daeboAfter = (await listProducts({ includeHidden: true })).filter(
    (p) => p.variety === '대보',
  );
  check(
    '그룹 안 상품 차례는 그대로다',
    daeboAfter.map((p) => p.name).join() === daeboBefore.map((p) => p.name).join(),
    daeboAfter.map((p) => p.name).join(' '),
  );
  check(
    '그룹 상품이 전부 같은 groupOrder 를 갖는다',
    new Set(daeboAfter.map((p) => p.groupOrder)).size === 1,
    [...new Set(daeboAfter.map((p) => p.groupOrder))].join(),
  );

  // 지금 자리를 그대로 넣으면 아무 일도 안 일어난다
  const sameSpot = await setGroupPosition('대보', 2);
  check('같은 자리를 넣으면 아무 일도 없다', sameSpot === false);
  check('차례도 그대로다', (await groupOrderNow()).join(' ') === afterMove.join(' '));

  // 범위를 벗어난 숫자는 맨 앞·맨 뒤로 접힌다 (오류가 아니다)
  await setGroupPosition('옥광', 99);
  check('큰 숫자는 맨 뒤가 된다', (await groupOrderNow()).at(-1) === '옥광');
  await setGroupPosition('대보', 0);
  check('0 은 맨 앞이 된다', (await groupOrderNow())[0] === '대보');

  // 되돌려 놓는다
  await setGroupPosition('포르단', 2);
  check(
    '되돌리면 원래 차례다',
    (await groupOrderNow()).join(' ') === '대보 포르단 옥광',
    (await groupOrderNow()).join(' '),
  );

  /* 그룹 안 상품 옮기기 */
  const items = (await listProducts({ includeHidden: true })).filter((p) => p.variety === '대보');
  const first = items[0];
  const second = items[1];

  await setProductPosition(first.id, 2); // 1번 → 2번
  const swapped = (await listProducts({ includeHidden: true })).filter((p) => p.variety === '대보');
  check(
    '상품을 2번으로 보내면 옆 상품과 자리가 바뀐다',
    swapped[0].id === second.id && swapped[1].id === first.id,
    swapped.slice(0, 2).map((p) => p.name).join(' / '),
  );
  check(
    '그룹 밖으로는 나가지 않는다',
    swapped.every((p) => p.variety === '대보') && swapped.length === items.length,
  );
  check(
    '옮긴 뒤 번호가 0부터 다시 매겨진다',
    swapped.every((p, i) => p.sortOrder === i),
    swapped.map((p) => p.sortOrder).join(','),
  );

  const lastItem = swapped[swapped.length - 1];
  const alreadyLast = await setProductPosition(lastItem.id, swapped.length);
  check('이미 그 자리면 아무 일도 없다', alreadyLast === false);

  await setProductPosition(first.id, 1); // 되돌린다

  /* ────────────────────────────────────────────── */
  section('22-6. 그룹 이름 바꾸기');

  const { renameGroup } = await import('../src/lib/products');

  const poredanCount = beforeGroupImage.filter((p) => p.variety === '포르단').length;
  const renamedCount = await renameGroup('포르단', '청실');
  check(
    '그룹 상품 전체의 이름이 바뀐다',
    renamedCount === poredanCount,
    `${renamedCount}개 / ${poredanCount}개`,
  );

  const afterRename = await listProducts({ includeHidden: true });
  check('포르단이 사라졌다', afterRename.every((p) => p.variety !== '포르단'));
  check(
    '청실로 옮겨졌고 크기·무게는 그대로다',
    afterRename.filter((p) => p.variety === '청실').length === poredanCount &&
      afterRename.some((p) => p.name === '청실 중 4kg') &&
      afterRename.some((p) => p.name === '청실 특 10kg'),
    afterRename
      .filter((p) => p.variety === '청실')
      .map((p) => p.name)
      .join(' / '),
  );

  // 이미 있는 이름으로 바꾸면 두 그룹이 섞인다. 막혀야 한다.
  let mergeBlocked = false;
  try {
    await renameGroup('청실', '대보');
  } catch {
    mergeBlocked = true;
  }
  check('이미 있는 그룹 이름으로는 못 바꾼다', mergeBlocked);

  let spaceBlocked = false;
  try {
    await renameGroup('청실', '청실 특');
  } catch {
    spaceBlocked = true;
  }
  check('띄어쓰기가 든 이름은 막힌다', spaceBlocked);

  // 되돌려 놓는다 — 뒤 점검이 시드 이름을 쓴다
  await renameGroup('청실', '포르단');
  const restored = await listProducts({ includeHidden: true });
  check(
    '되돌리면 원래 이름으로 돌아온다',
    restored.filter((p) => p.variety === '포르단').length === poredanCount,
  );

  /* ────────────────────────────────────────────── */
  section('22-8. 그룹은 이름에서 읽지 않고 적어 둔 것을 쓴다');

  const { createProduct, deleteProduct, createGroup, deleteGroup, listGroupNames } = await import(
    '../src/lib/products'
  );

  /*
    예전에는 그룹을 상품 이름 맨 앞 낱말에서 읽었다. 크기 이름이 목록(중·대·특)에
    없으면 "대보 소 8kg" 의 품종이 "대보 소" 가 되어 대보 옆에 새 그룹이 생겼다.
    아버지가 "+ 대보 에 상품 추가" 를 눌렀는데 대보 밖으로 나가던 그 증상이다.
  */
  const oddId = await createProduct({
    name: '대보 소 8kg',
    price: 50000,
    imageUrl: '',
    stock: 3,
    hidden: false,
    group: '대보',
  });

  const withOdd = await listProducts({ includeHidden: true });
  const odd = withOdd.find((p) => p.id === oddId)!;
  check('크기가 목록에 없어도 누른 그룹에 들어간다', odd.variety === '대보', odd.variety);
  check(
    '새 그룹이 생기지 않았다',
    (await listGroupNames()).join(' ') === '대보 포르단 옥광',
    (await listGroupNames()).join(' '),
  );
  check('대보 맨 뒤에 붙는다', withOdd.filter((p) => p.variety === '대보').at(-1)?.id === oddId);

  // 그룹 이름을 지우고 적어도 서버가 앞에 붙여 준다
  const bareId = await createProduct({
    name: '왕 9kg',
    price: 60000,
    imageUrl: '',
    stock: 1,
    hidden: false,
    group: '대보',
  });
  const bare = (await listProducts({ includeHidden: true })).find((p) => p.id === bareId)!;
  check('그룹 이름이 빠졌으면 앞에 붙여 준다', bare.name === '대보 왕 9kg', bare.name);

  // 상품 이름을 고쳐도 그룹은 따라 옮겨 다니지 않는다
  await updateProduct(bareId, { name: '대보 왕 12kg' });
  const renamedItem = (await listProducts({ includeHidden: true })).find((p) => p.id === bareId)!;
  check('이름을 고쳐도 그룹은 그대로다', renamedItem.variety === '대보', renamedItem.variety);

  await deleteProduct(oddId);
  await deleteProduct(bareId);

  /* 상품 없는 그룹 */
  await createGroup('청실');
  const withEmpty = await listGroupNames();
  check('상품 없이도 그룹이 만들어진다', withEmpty.includes('청실'), withEmpty.join(' '));
  check('맨 뒤에 붙는다', withEmpty.at(-1) === '청실');
  check(
    '빈 그룹이라 상품은 하나도 없다',
    (await listProducts({ includeHidden: true })).every((p) => p.variety !== '청실'),
  );

  let dupBlocked = false;
  try {
    await createGroup('대보');
  } catch {
    dupBlocked = true;
  }
  check('이미 있는 이름으로는 못 만든다', dupBlocked);

  // 빈 그룹도 차례를 옮길 수 있다
  await setGroupPosition('청실', 1);
  check('빈 그룹도 맨 앞으로 갈 수 있다', (await listGroupNames())[0] === '청실');
  check(
    '상품이 든 그룹 차례는 그대로다',
    (await listGroupNames()).join(' ') === '청실 대보 포르단 옥광',
    (await listGroupNames()).join(' '),
  );

  // 빈 그룹에 상품을 넣으면 그 자리를 그대로 지킨다
  const firstOfEmpty = await createProduct({
    name: '청실 중 4kg',
    price: 30000,
    imageUrl: '',
    stock: 5,
    hidden: false,
    group: '청실',
  });
  const shopOrder = await listProducts({ includeHidden: true });
  check(
    '빈 그룹에 넣은 상품이 맨 앞 그룹에 온다',
    shopOrder[0].id === firstOfEmpty,
    shopOrder[0].name,
  );

  let deleteBlocked = false;
  try {
    await deleteGroup('청실');
  } catch {
    deleteBlocked = true;
  }
  check('상품이 든 그룹은 못 지운다', deleteBlocked);

  await deleteProduct(firstOfEmpty);
  await deleteGroup('청실');
  check(
    '비운 뒤에는 지워진다',
    (await listGroupNames()).join(' ') === '대보 포르단 옥광',
    (await listGroupNames()).join(' '),
  );

  /* ────────────────────────────────────────────── */
  section('23. 기본 상품 목록 (시드 스크립트가 쓰는 값)');

  // 화면의 "기본 상품 넣기" 버튼은 없앴지만 npm run seed 는 이 목록을 그대로 쓴다.
  const { defaultProducts } = await import('../src/lib/seed-products');
  const seedList = defaultProducts();

  check('기본 목록이 18종이다', seedList.length === 18, `${seedList.length}종`);
  check('이름이 겹치지 않는다', new Set(seedList.map((p) => p.name)).size === seedList.length);
  check('모든 상품에 가격이 있다', seedList.every((p) => p.price > 0));
  check(
    '그룹마다 sortOrder 가 0부터 이어진다',
    ['대보', '포르단', '옥광'].every((v) =>
      seedList.filter((p) => p.variety === v).every((p, i) => p.sortOrder === i),
    ),
  );
  check(
    '품종마다 groupOrder 가 하나씩 매겨진다',
    seedList.filter((p) => p.variety === '대보').every((p) => p.groupOrder === 0) &&
      seedList.filter((p) => p.variety === '포르단').every((p) => p.groupOrder === 1) &&
      seedList.filter((p) => p.variety === '옥광').every((p) => p.groupOrder === 2),
  );
  // 파일 이름을 바꿔 놓고 여기를 안 고치면 손님 화면에 깨진 그림이 뜬다.
  // 확장자만 보지 말고 **public/ 에 실제로 있는지** 확인한다.
  const { existsSync } = await import('node:fs');
  const missing = [...new Set(seedList.map((p) => p.imageUrl))].filter(
    (url) => !existsSync(`public${url}`),
  );
  check('사진이 public/ 에 실제로 있는 파일을 가리킨다', missing.length === 0, missing.join(' / '));

  /* ────────────────────────────────────────────── */
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`통과 ${passed}건, 실패 ${failed}건`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n실행 중 오류:', err);
  process.exit(1);
});
