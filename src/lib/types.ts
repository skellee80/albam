/**
 * 앱 전역 도메인 타입.
 *
 * 시간 값은 전부 epoch milliseconds(number)로 다룬다.
 * Firestore Timestamp를 그대로 쓰면 서버 컴포넌트 → 클라이언트 컴포넌트로
 * 넘길 때 직렬화가 깨지므로, 저장소 경계(mapper)에서 number로 변환한다.
 */

export const VARIETIES = ['대보', '포르단', '옥광'] as const;
export type Variety = (typeof VARIETIES)[number];

export const SIZES = ['중', '대', '특대'] as const;
export type Size = (typeof SIZES)[number];

export interface Product {
  id: string;
  /**
   * "대보 중" 처럼 품종과 크기를 합친 이름. **이 값이 유일한 출처다.**
   * variety/size는 여기서 자동으로 뽑아낸다(parseProductName).
   * 관리자가 이름만 고치면 손님 화면의 묶음 제목과 크기 표시가 함께 따라간다.
   */
  name: string;
  /** 이름에서 유도된 값. 손님 화면에서 상품을 묶는 기준. 직접 입력하지 않는다. */
  variety: string;
  /** 이름에서 유도된 값. 묶음 안에서 각 줄의 이름표. 직접 입력하지 않는다. */
  size: string;
  price: number; // 원
  imageUrl: string;
  stock: number; // 현재 남은 재고 (0이면 매진)
  hidden: boolean; // 상품 목록에서 숨김
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

/** 주문 상태. 화면 표기와 DB 값이 같아 아버지가 콘솔에서 봐도 읽힌다. */
export const ORDER_STATUSES = [
  '입금대기',
  '발송대기',
  '발송완료',
  '취소',
  '환불요청',
  '환불완료',
  '교환요청',
  '교환완료',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * 재고를 "놓아주는" 상태.
 *
 * 재고는 주문 생성 시점에 선점(차감)한다. 무통장이라 입금까지 시간이 걸리는데
 * 그 사이 초과 판매가 나면 수습할 방법이 없기 때문이다.
 *
 * 복원은 플래그로 추적하지 않고, 주문 상태로부터 "지금 이 주문이 잡고 있어야 할 재고"를
 * 매번 다시 계산해서 그 차이만 적용한다(orders.ts의 reservationOf 참고).
 * 상태를 왔다 갔다 해도 이중 복원/이중 차감이 원리적으로 불가능하다.
 */
export const STOCK_RELEASING_STATUSES: readonly OrderStatus[] = ['취소', '환불완료'];

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

export interface Order {
  id: string;
  orderNo: string; // "20260726-0001"
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

/** 장바구니에서 서버로 넘어오는 입력. 가격은 받지 않는다 — 서버가 다시 계산한다. */
export interface CartLine {
  productId: string;
  qty: number;
}
