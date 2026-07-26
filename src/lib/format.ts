/**
 * 표시 형식과 정규화 유틸.
 *
 * 날짜·금액을 Intl(=런타임 ICU 데이터)에 맡기지 않고 직접 만든다.
 *
 * 이유: 서버(Node)와 브라우저의 ICU 데이터가 달라 같은 값이 다르게 찍힌다.
 * 실제로 ko-KR 오전/오후가 서버에서는 "PM", 브라우저에서는 "오후"로 나와
 * 하이드레이션이 깨졌다. 여기서 만드는 문자열은 어느 런타임에서도 동일하다.
 *
 * 서버는 UTC로 돌기 때문에(Cloud Run) 시간은 반드시 한국 시간으로 옮겨서 쓴다.
 * 이걸 빼먹으면 오전 9시 이전 주문이 하루 전 날짜로 찍힌다.
 */
import { SIZES } from './types';

/**
 * 한국 표준시는 UTC+9 고정이고 서머타임이 없다(1988년 이후).
 * 그래서 시간대 데이터베이스 없이 더하기 하나로 정확히 옮길 수 있다.
 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

type KstParts = { year: number; month: number; day: number; hour: number; minute: number };

/** epoch ms → 한국 시간의 달력 값. UTC 게터만 써서 실행 환경의 시간대와 무관하다. */
function kstParts(ms: number): KstParts {
  const shifted = new Date(ms + KST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 24시간 → 오전/오후 + 12시간제 (0시는 오전 12시, 12시는 오후 12시) */
function toAmPm(hour: number): { period: '오전' | '오후'; hour12: number } {
  return {
    period: hour < 12 ? '오전' : '오후',
    hour12: hour % 12 === 0 ? 12 : hour % 12,
  };
}

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

/** 천 단위 쉼표도 직접 넣는다 — 로케일 데이터에 기대지 않기 위해. */
export function formatKRW(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${digits}원`;
}

/** 010-1234-5678 형태로 보기 좋게 */
export function formatPhone(value: string): string {
  const d = normalizePhone(value);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return value;
}

/** 2026년 7월 26일 */
export function formatDate(ms: number): string {
  const { year, month, day } = kstParts(ms);
  return `${year}년 ${month}월 ${day}일`;
}

/** 2026년 7월 26일 오후 6:52 */
export function formatDateTime(ms: number): string {
  const parts = kstParts(ms);
  const { period, hour12 } = toAmPm(parts.hour);
  return `${parts.year}년 ${parts.month}월 ${parts.day}일 ${period} ${hour12}:${pad2(parts.minute)}`;
}

/** 7월 26일 오후 6:52 — 목록에서 자리를 아껴야 할 때 */
export function formatShortDateTime(ms: number): string {
  const parts = kstParts(ms);
  const { period, hour12 } = toAmPm(parts.hour);
  return `${parts.month}월 ${parts.day}일 ${period} ${hour12}:${pad2(parts.minute)}`;
}

/** KST 기준 YYYYMMDD. 주문번호 채번과 일별 매출 집계에 쓴다. */
export function kstDateKey(ms: number = Date.now()): string {
  const { year, month, day } = kstParts(ms);
  return `${year}${pad2(month)}${pad2(day)}`;
}

/** KST 기준 7.26 라벨 (차트 축용) */
export function kstDayLabel(ms: number): string {
  const { month, day } = kstParts(ms);
  return `${month}.${day}`;
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
