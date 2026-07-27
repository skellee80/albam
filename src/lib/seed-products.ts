import { SIZES, VARIETIES, WEIGHTS, type ProductSeed } from './types';

/**
 * 처음 시작할 때 넣는 상품 18종 (품종 3 × 크기 3 × 무게 2).
 *
 * 가격과 사진은 **임시값**이다. 관리자 화면에서 바꾸라고 안내한다.
 * 로컬 시드 스크립트(scripts/seed.ts)와 관리자 화면의 "기본 상품 넣기" 버튼이
 * 같은 목록을 쓴다 — 두 벌로 두면 한쪽만 고쳐져 서로 달라진다.
 */

/** 4kg 기준 가격. 10kg 는 대략 2.2배(대량 할인)로 잡았다. */
const PRICES: Record<string, Record<string, Record<string, number>>> = {
  대보: {
    '4kg': { 중: 28000, 대: 35000, 특: 45000 },
    '10kg': { 중: 62000, 대: 78000, 특: 99000 },
  },
  포르단: {
    '4kg': { 중: 26000, 대: 33000, 특: 42000 },
    '10kg': { 중: 58000, 대: 73000, 특: 93000 },
  },
  옥광: {
    '4kg': { 중: 32000, 대: 40000, 특: 52000 },
    '10kg': { 중: 71000, 대: 89000, 특: 115000 },
  },
};

const IMAGES: Record<string, string> = {
  대보: '/products/daebo.svg',
  포르단: '/products/poredan.svg',
  옥광: '/products/okgwang.svg',
};

/** 처음 넣을 재고. 관리자 화면에서 바로 바꿀 수 있다. */
export const SEED_STOCK = 50;

/**
 * 손님 화면이 품종 → 크기 → 무게 순으로 묶이므로 sortOrder도 같은 순서로 매긴다.
 * 순서가 어긋나면 나중에 상품을 추가할 때 자리가 이상해진다.
 */
export function defaultProducts(): ProductSeed[] {
  const list: ProductSeed[] = [];
  let sortOrder = 0;

  for (const variety of VARIETIES) {
    for (const size of SIZES) {
      for (const weight of WEIGHTS) {
        list.push({
          name: `${variety} ${size} ${weight}`,
          variety,
          size,
          weight,
          price: PRICES[variety][weight][size],
          imageUrl: IMAGES[variety],
          stock: SEED_STOCK,
          hidden: false,
          sortOrder: sortOrder++,
        });
      }
    }
  }

  return list;
}
