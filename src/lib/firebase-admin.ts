// 이 모듈에는 의도적으로 'server-only' 를 붙이지 않는다.
// 시드 스크립트(scripts/seed.ts)가 tsx로 이 파일을 직접 불러오는데,
// 'server-only' 는 React Server Component 환경 밖에서 import되면 예외를 던지기 때문이다.
// 클라이언트 유입 방지는 이 파일을 쓰는 상위 모듈(orders/products/deposits/settings/auth)에서 건다.
import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';

/**
 * Firestore 접근은 전부 여기를 거친다.
 *
 * - App Hosting에서는 서비스 계정 자격증명(ADC)을 자동으로 얻으므로 키 파일이 필요 없다.
 * - 로컬에서는 FIRESTORE_EMULATOR_HOST 가 설정되어 있으면 SDK가 알아서 에뮬레이터로 붙는다.
 *   (자격증명 없이 동작 → 실데이터 오염/과금 없음)
 */

const PROJECT_ID =
  process.env.GOOGLE_CLOUD_PROJECT ??
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
  'albam-416fd';

// Next.js 개발 서버는 모듈을 여러 번 평가한다. globalThis에 캐시해 앱/설정 중복 초기화를 막는다.
const globalForDb = globalThis as unknown as { __albamDb?: Firestore };

function getApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];
  return initializeApp({ projectId: PROJECT_ID });
}

function createDb(): Firestore {
  const firestore = getFirestore(getApp());
  // 관리자 수정 화면에서 비워둔 선택 필드가 undefined로 들어와도 쓰기가 실패하지 않게 한다.
  firestore.settings({ ignoreUndefinedProperties: true });
  return firestore;
}

export const db: Firestore = (globalForDb.__albamDb ??= createDb());

export const COL = {
  products: 'products',
  orders: 'orders',
  deposits: 'deposits',
  settings: 'settings',
  counters: 'counters',
} as const;

/**
 * Firestore Timestamp → epoch ms.
 * 저장소 경계에서 전부 number로 바꿔야 서버 → 클라이언트 컴포넌트 직렬화가 깨지지 않는다.
 */
export function toMillis(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  return null;
}

export function toMillisOr(value: unknown, fallback: number): number {
  return toMillis(value) ?? fallback;
}
