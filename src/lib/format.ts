/**
 * 표시 형식과 정규화 유틸.
 *
 * 서버는 UTC로 돌기 때문에(Cloud Run) 날짜/시간은 반드시 Asia/Seoul을 명시한다.
 * 이걸 빼먹으면 오전 9시 이전 주문이 하루 전 날짜로 찍힌다.
 */
import { SIZES } from './types';

const KST = 'Asia/Seoul';

/**
 * 입금자명 정규화.
 * 은행 문자마다 공백이 들쭉날쭉하고, 자모 조합 방식(NFC/NFD)도 기기마다 다르다.
 * 매칭과 조회는 항상 이 정규화 결과끼리 비교한다.
 */
export function normalizeName(value: string): string {
  return value.normalize('NFC').replace(/\s+/g, '').toLowerCase();
}

/** 전화번호는 숫자만 남겨서 비교한다. (010-1234-5678 / 01012345678 동일 취급) */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatKRW(amount: number): string {
  return `${Math.round(amount).toLocaleString('ko-KR')}원`;
}

/** 010-1234-5678 형태로 보기 좋게 */
export function formatPhone(value: string): string {
  const d = normalizePhone(value);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return value;
}

export function formatDate(ms: number): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(ms));
}

export function formatDateTime(ms: number): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

export function formatShortDateTime(ms: number): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

/** KST 기준 YYYYMMDD. 주문번호 채번과 일별 매출 집계에 쓴다. */
export function kstDateKey(ms: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
  return parts.replace(/-/g, '');
}

/** KST 기준 M/D 라벨 (차트 축용) */
export function kstDayLabel(ms: number): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: KST,
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(ms));
}

/**
 * 상품 이름에서 품종과 크기를 뽑는다. "대보 중" → { variety: '대보', size: '중' }
 *
 * 관리자는 이름 하나만 입력하고, 품종·크기는 여기서 유도한다.
 * 같은 값을 두 군데 입력받으면 반드시 어긋나기 때문이다
 * (이름만 바꾸고 품종을 그대로 두면 손님 화면이 옛 이름으로 남는다).
 *
 * 마지막 낱말이 알려진 크기가 아니면 이름 전체를 품종으로 본다.
 * 그래야 "꿀밤 선물세트" 같은 새 이름을 넣어도 목록에서 사라지지 않는다.
 */
export function parseProductName(name: string): { variety: string; size: string } {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');
  const last = parts[parts.length - 1];

  if (parts.length >= 2 && (SIZES as readonly string[]).includes(last)) {
    return { variety: parts.slice(0, -1).join(' '), size: last };
  }
  return { variety: cleaned, size: '' };
}

/** "대보 중 2 · 옥광 특대 1" 형태의 주문 요약 */
export function summarizeItems(items: { name: string; qty: number }[]): string {
  return items.map((i) => `${i.name} ${i.qty}`).join(' · ');
}
