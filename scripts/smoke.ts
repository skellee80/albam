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
    bankName: '농협',
  });
  check('금액·이름이 맞으면 확정된다', exact.status === '확정', exact.message);
  check('확정 응답에 상품 요약이 들어간다', exact.message.includes(DAEBO_MID_NAME), exact.message);

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
    depositorPhone: '010-1234-5678',
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
  section('15. 입금 기한 24시간이 지나면 자동 취소 + 재고 복원');

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
    '입금 마감 시각을 알려준다 (주문 + 24시간)',
    Math.abs(stale.paymentDueAt - (Date.now() + PAYMENT_DEADLINE_MS)) < 60_000,
  );

  // 한 건만 24시간하고도 1분 전에 들어온 것처럼 되돌린다
  await db
    .collection(COL.orders)
    .doc(stale.orderId)
    .update({ createdAt: Date.now() - PAYMENT_DEADLINE_MS - 60_000 });

  const cancelledCount = await expireStaleOrders({ force: true });
  check('기한 지난 주문만 취소된다', cancelledCount === 1, `${cancelledCount}건 취소`);

  const staleAfter = await getOrder(stale.orderId);
  const freshAfter = await getOrder(fresh.orderId);
  check('기한 지난 주문이 취소 상태가 된다', staleAfter?.status === '취소', staleAfter?.status);
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

  section('16. 재고 안내는 10개 이하일 때만 숫자를 보여준다');

  const { stockNotice, LOW_STOCK_NOTICE_THRESHOLD } = await import('../src/lib/types');

  check('기준값은 10개', LOW_STOCK_NOTICE_THRESHOLD === 10, `${LOW_STOCK_NOTICE_THRESHOLD}`);
  check('재고가 넉넉하면 숫자를 감춘다', stockNotice(11) === '주문 가능', stockNotice(11));
  check('딱 10개면 숫자를 보여준다', stockNotice(10) === '10개 남았습니다', stockNotice(10));
  check('3개 남으면 숫자를 보여준다', stockNotice(3) === '3개 남았습니다', stockNotice(3));
  check('1개 남아도 주문할 수 있다', stockNotice(1) === '1개 남았습니다', stockNotice(1));
  check('0개면 품절 안내', stockNotice(0) === '지금은 준비된 물량이 없습니다', stockNotice(0));

  section('17. 환불요청·교환요청 상태는 없다');

  const { ORDER_STATUSES: statuses } = await import('../src/lib/types');
  check('환불요청이 상태 목록에 없다', !(statuses as readonly string[]).includes('환불요청'));
  check('교환요청이 상태 목록에 없다', !(statuses as readonly string[]).includes('교환요청'));
  check('환불완료는 남아 있다', (statuses as readonly string[]).includes('환불완료'));
  check('교환완료는 남아 있다', (statuses as readonly string[]).includes('교환완료'));

  /* ────────────────────────────────────────────── */
  section('18. 날짜·금액 형식이 실행 환경에 좌우되지 않는가');

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
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`통과 ${passed}건, 실패 ${failed}건`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n실행 중 오류:', err);
  process.exit(1);
});
