/**
 * 초기 데이터 시드: 상품 9종 + 기본 설정.
 *
 *   npm run emulators      # 다른 터미널에서 먼저 실행
 *   npm run seed
 *
 * 실제 프로젝트에 시드하려면 .env.local 에서 FIRESTORE_EMULATOR_HOST 를 지우고
 * `gcloud auth application-default login` 으로 자격증명을 준비한 뒤 실행한다.
 *
 * 이미 있는 상품은 이름으로 찾아 갱신하므로 여러 번 실행해도 중복되지 않는다.
 * 단, 재고(stock)는 덮어쓰므로 운영 중에는 실행하지 말 것.
 */
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

async function main() {
  // .env 를 먼저 읽어야 에뮬레이터 설정이 적용되므로 동적 import 를 쓴다.
  const { COL, db } = await import('../src/lib/firebase-admin');
  const { DEFAULT_SETTINGS, SIZES, VARIETIES } = await import('../src/lib/types');

  const target = process.env.FIRESTORE_EMULATOR_HOST
    ? `에뮬레이터(${process.env.FIRESTORE_EMULATOR_HOST})`
    : `실제 Firestore(${process.env.GOOGLE_CLOUD_PROJECT ?? 'albam-416fd'})`;
  console.log(`시드 대상: ${target}\n`);

  // 임시 가격. PRD상 추후 업데이트 예정이며 관리자 화면에서 바꿀 수 있다.
  const priceTable: Record<string, Record<string, number>> = {
    대보: { 중: 28000, 대: 35000, 특대: 45000 },
    포르단: { 중: 26000, 대: 33000, 특대: 42000 },
    옥광: { 중: 32000, 대: 40000, 특대: 52000 },
  };
  const imageByVariety: Record<string, string> = {
    대보: '/products/daebo.svg',
    포르단: '/products/poredan.svg',
    옥광: '/products/okgwang.svg',
  };

  const existing = await db.collection(COL.products).get();
  const byName = new Map(existing.docs.map((d) => [d.data().name as string, d.ref]));

  const now = Date.now();
  let sortOrder = 0;
  let created = 0;
  let updated = 0;

  for (const variety of VARIETIES) {
    for (const size of SIZES) {
      const name = `${variety} ${size}`;
      const payload = {
        name,
        variety,
        size,
        price: priceTable[variety][size],
        imageUrl: imageByVariety[variety],
        stock: 50,
        initialStock: 50,
        hidden: false,
        sortOrder: sortOrder++,
        updatedAt: now,
      };

      const ref = byName.get(name);
      if (ref) {
        await ref.update(payload);
        updated++;
      } else {
        await db.collection(COL.products).add({ ...payload, createdAt: now });
        created++;
      }
      console.log(`  ${ref ? '갱신' : '생성'}  ${name.padEnd(10)} ${payload.price.toLocaleString('ko-KR')}원  재고 ${payload.stock}`);
    }
  }

  const settingsRef = db.collection(COL.settings).doc('config');
  const settingsSnap = await settingsRef.get();
  if (!settingsSnap.exists) {
    await settingsRef.set({ ...DEFAULT_SETTINGS, updatedAt: now });
    console.log('\n  생성  설정(입금 계좌·연락처) — 관리자 화면에서 실제 값으로 바꾸세요.');
  } else {
    console.log('\n  유지  설정(입금 계좌·연락처) — 기존 값을 덮어쓰지 않았습니다.');
  }

  console.log(`\n완료: 상품 ${created}개 생성, ${updated}개 갱신.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n시드 실패:', err);
    process.exit(1);
  });
