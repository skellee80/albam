/**
 * 앱 전역 도메인 타입.
 *
 * 시간 값은 전부 epoch milliseconds(number)로 다룬다.
 * Firestore Timestamp를 그대로 쓰면 서버 컴포넌트 → 클라이언트 컴포넌트로
 * 넘길 때 직렬화가 깨지므로, 저장소 경계(mapper)에서 number로 변환한다.
 */

export const VARIETIES = ['대보', '포르단', '옥광'] as const;
export type Variety = (typeof VARIETIES)[number];

export const SIZES = ['중', '대', '특'] as const;
export type Size = (typeof SIZES)[number];

/**
 * 예전에 쓰던 표기 → 지금 표기.
 * "특대"로 이름 붙여 둔 상품이 남아 있어도 묶음에서 빠지지 않게 한다.
 */
export const SIZE_ALIASES: Record<string, Size> = { 특대: '특' };

/** 판매 단위 무게. 상품 이름 끝에 붙여서 쓴다 ("대보 중 4kg"). */
export const WEIGHTS = ['4kg', '10kg'] as const;
export type Weight = (typeof WEIGHTS)[number];

/** 처음 넣는 상품 한 건 (variety/size/weight 는 이름에서 유도되지만 시드는 함께 저장한다) */
export type ProductSeed = {
  name: string;
  variety: string;
  size: string;
  weight: string;
  price: number;
  imageUrl: string;
  stock: number;
  hidden: boolean;
  sortOrder: number;
};

/**
 * 크기 안내.
 * 크기는 모든 품종·무게에서 똑같이 반복되므로 상품마다 붙이지 않고
 * 목록 맨 위에서 한 번만 설명한다.
 *
 * tone은 실속 → 선물 → 최상급으로 올라가는 등급을 색으로도 알려준다.
 */
export const SIZE_GUIDE: {
  size: Size;
  tag: string;
  note: string;
  tone: 'burr' | 'shell' | 'amber';
}[] = [
  { size: '중', tag: '온가족 행복', note: '온 가족 부담없이 즐기는 실속용', tone: 'burr' },
  { size: '대', tag: '품격있는 추천', note: '품질과 가격 만족도 높은 선물용', tone: 'shell' },
  { size: '특', tag: '최상급 프리미엄', note: '격식 있는 최상급 선물용', tone: 'amber' },
];

export interface Product {
  id: string;
  /**
   * "대보 중" 처럼 품종과 크기를 합친 이름. **이 값이 유일한 출처다.**
   * variety/size는 여기서 자동으로 뽑아낸다(parseProductName).
   * 관리자가 이름만 고치면 손님 화면의 묶음 제목과 크기 표시가 함께 따라간다.
   */
  name: string;
  /** 이름에서 유도된 값. 품종 + 무게가 손님 화면의 묶음 기준. 직접 입력하지 않는다. */
  variety: string;
  /** 이름에서 유도된 값. 묶음 안에서 각 줄의 이름표. 직접 입력하지 않는다. */
  size: string;
  /** 이름에서 유도된 값. "4kg" / "10kg". 품종과 함께 묶음을 나눈다. */
  weight: string;
  price: number; // 원
  imageUrl: string;
  stock: number; // 현재 남은 재고 (0이면 매진)
  hidden: boolean; // 상품 목록에서 숨김
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * 주문 상태. 화면 표기와 DB 값이 같아 아버지가 콘솔에서 봐도 읽힌다.
 *
 * **"취소" 상태는 없다.** 물러난 주문은 상태가 아니라 `deleted` 로 다룬다.
 * 예전에는 취소가 따로 있었는데, 결국 삭제와 하는 일이 똑같았다 —
 * 둘 다 재고를 되돌리고, 둘 다 손님 조회에서 감춰졌다. 값만 두 개라
 * 관리자 화면 곳곳(상태 목록·필터 칸)에 아무도 고르지 않는 칸이 생겼다.
 *
 * 이제 물러나는 길은 하나뿐이다.
 *  - 입금 기한이 지나면 자동으로 삭제 (expireStaleOrders)
 *  - 손님이 주문 조회에서 스스로 무르면 삭제 (cancelOwnOrder)
 *  - 아버지가 주문 화면에서 "주문 삭제"
 * 셋 다 되살릴 수 있고, 되살리면 재고도 함께 다시 잡힌다.
 *
 * "환불요청"·"교환요청"도 두지 않는다. 고객이 사이트에서 신청하는 경로가 없고
 * 전화로 받아 아버지가 직접 처리하므로, 중간 상태를 만들면 아무도 안 쓰는 칸만 늘어난다.
 */
export const ORDER_STATUSES = ['입금대기', '발송대기', '발송완료', '환불완료', '교환완료'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** 예전 문서에 남아 있는 상태 값. 지금은 삭제로 갈음한다. */
export const LEGACY_CANCELLED_STATUS = '취소';

/**
 * 입금 기한. 이 시간이 지난 입금대기 주문은 자동으로 취소되고 재고가 돌아간다.
 *
 * 무통장이라 주문 시점에 재고를 선점하는데, 입금하지 않은 주문이 재고를 계속
 * 붙들고 있으면 정작 살 사람이 못 산다.
 *
 * 제철 상품이라 재고를 오래 붙들어 두지 않으려고 짧게 잡았다.
 * 취소돼도 손님이 다시 주문하면 되므로 되돌릴 수 없는 손해는 아니다.
 */
export const PAYMENT_DEADLINE_HOURS = 1;

export const PAYMENT_DEADLINE_MS = PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000;

/** 이 주문의 입금 마감 시각 */
export function paymentDueAt(createdAt: number): number {
  return createdAt + PAYMENT_DEADLINE_MS;
}

/**
 * 재고가 이 수 이하로 남으면 손님에게 남은 수량을 알린다.
 * 평소에는 숫자를 감춘다 — 넉넉할 때 "47개 남음"은 알려줄 것이 없는 소음이다.
 */
export const LOW_STOCK_NOTICE_THRESHOLD = 10;

/** 상품 목록에서 재고 상태를 한 줄로 알린다. */
export function stockNotice(stock: number): string {
  if (stock <= 0) return '지금은 준비된 물량이 없습니다';
  if (stock <= LOW_STOCK_NOTICE_THRESHOLD) return `${stock}개 남았습니다`;
  return '주문 가능';
}

/**
 * 재고를 "놓아주는" 상태.
 *
 * 재고는 주문 생성 시점에 선점(차감)한다. 무통장이라 입금까지 시간이 걸리는데
 * 그 사이 초과 판매가 나면 수습할 방법이 없기 때문이다.
 *
 * 복원은 플래그로 추적하지 않고, 주문 상태로부터 "지금 이 주문이 잡고 있어야 할 재고"를
 * 매번 다시 계산해서 그 차이만 적용한다(orders.ts의 reservationOf 참고).
 * 상태를 왔다 갔다 해도 이중 복원/이중 차감이 원리적으로 불가능하다.
 *
 * 삭제된 주문(`deleted`)도 같이 놓아준다 — 그쪽은 상태가 아니라 플래그라 여기 없다.
 */
export const STOCK_RELEASING_STATUSES: readonly OrderStatus[] = ['환불완료'];

/** 고객이 /track 에서 볼 수 있는 상태의 진행 단계 */
export const TRACK_STEPS: readonly OrderStatus[] = ['입금대기', '발송대기', '발송완료'];

export interface OrderItem {
  productId: string;
  name: string; // 주문 시점 상품명 스냅샷
  price: number; // 주문 시점 단가 스냅샷 (서버 재계산 결과)
  qty: number;
  subtotal: number;
}

export interface Recipient {
  name: string;
  phone: string;
  address: string;
}

/**
 * 이 주문이 어디서 들어왔나.
 *
 *  - `online` 손님이 사이트에서 직접 주문 (기본값)
 *  - `direct` 아버지가 전화·방문 판매를 관리자에서 손으로 넣음
 *
 * 판매 현황에서 둘을 나눠 보기 위한 값이다. 합쳐서만 보면 사이트가 실제로
 * 얼마나 일하고 있는지 알 수 없다. 재고 차감과 매출 집계는 둘이 똑같이 한다.
 */
export const ORDER_SOURCES = ['online', 'direct'] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export const ORDER_SOURCE_LABEL: Record<OrderSource, string> = {
  online: '인터넷 판매',
  direct: '직접 판매',
};

export interface Order {
  id: string;
  orderNo: string; // "20260726-0001"
  /** 예전 문서에는 없다. 없으면 인터넷 주문으로 본다. */
  source: OrderSource;
  recipient: Recipient;
  phoneNorm: string; // 받는 분 전화번호, 숫자만 (조회용)
  depositorName: string;
  depositorNameNorm: string; // 공백 제거 + NFC (매칭/조회용)
  depositorPhone: string; // 입금하신 분 연락처 — 입금 문제로 연락할 곳
  depositorPhoneNorm: string; // 숫자만 (조회용)
  sameAsDepositor: boolean;
  items: OrderItem[];
  totalAmount: number; // 서버가 재계산한 값만 저장
  status: OrderStatus;
  trackingNo: string; // 우체국 송장번호 (조회 연동은 추후)
  memo: string; // 관리자 메모 (환불/교환 사유 등)
  refundAmount: number;
  deleted: boolean;
  createdAt: number;
  updatedAt: number;
  /**
   * 이 시각까지 입금해야 한다. 지나면 자동 취소된다.
   *
   * createdAt에서 계산하지 않고 따로 두는 이유: 주문을 합치면 기한이 다시 시작해야 한다.
   * 어제 담아 둔 주문에 오늘 상품을 더했는데 몇 시간 뒤 취소되면 손님이 납득할 수 없다.
   */
  paymentDueAt: number;
  paidAt: number | null; // 입금 매칭 확정 시각
  shippedAt: number | null;
}

export const DEPOSIT_STATUSES = ['확정', '확인필요', '미매칭', '무시'] as const;
export type DepositStatus = (typeof DEPOSIT_STATUSES)[number];

/** 관리자가 아직 손대야 하는 입금 */
export const UNRESOLVED_DEPOSIT_STATUSES: readonly DepositStatus[] = ['확인필요', '미매칭'];

/**
 * MacroDroid가 보낸 입금 1건.
 * 매칭에 실패한 건도 반드시 남긴다 — 나중에 추적할 유일한 단서다.
 */
export interface Deposit {
  id: string; // 중복 방지 키가 곧 문서 ID
  amount: number;
  depositorName: string;
  depositorNameNorm: string;
  bankName: string;
  /**
   * 문자 원문. 사람이 확인해야 하는 건(확인필요·미매칭·해석실패)에만 남는다.
   * 확정된 건은 비어 있다 — 계좌번호와 잔액이 들어 있어 쌓아둘 이유가 없다.
   */
  rawText: string;
  status: DepositStatus;
  matchedOrderId: string | null;
  candidateOrderIds: string[]; // 동명이인일 때 후보 주문
  responseText: string; // MacroDroid에 돌려준 문구 (재전송 시 그대로 재사용)
  receivedAt: number;
  resolvedAt: number | null;
}

export interface Settings {
  bankName: string;
  bankAccount: string;
  bankHolder: string;
  contactPhone: string;
}

export const DEFAULT_SETTINGS: Settings = {
  bankName: '농협',
  bankAccount: '000-0000-0000-00',
  bankHolder: '홍길동',
  contactPhone: '010-0000-0000',
};

/**
 * 장바구니에서 서버로 넘어오는 입력.
 *
 * **손님 주문에서는 가격을 받지 않는다** — 서버가 상품 문서를 다시 읽어 계산한다.
 * 브라우저에서 값을 고쳐 보내도 저장되는 금액이 바뀌지 않는 것이 이 사이트의 핵심 방어다.
 */
export interface CartLine {
  productId: string;
  qty: number;
  /**
   * 이 줄에만 적용할 단가.
   *
   * **관리자가 직접 넣는 주문(source: 'direct')에서만 쓰인다.** 그 외에는 조용히 버린다.
   * 장터에서 깎아 팔거나 아는 분께 싸게 드리는 일이 실제로 있어서 열어 둔 길인데,
   * 손님 화면까지 열리면 가격 조작이 되므로 서버에서 경로를 갈라 막는다.
   */
  price?: number;
}
