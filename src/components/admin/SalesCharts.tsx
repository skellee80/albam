'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatKRW } from '@/lib/format';
import type { DailySales, ProductSales } from '@/lib/stats';

/**
 * 두 차트 모두 계열이 하나뿐인 "크기" 표현이라 색을 하나만 쓴다.
 * 품목마다 다른 색을 칠하면 정체성을 나타내는 것처럼 보이지만 실제로는 크기 비교라 방해만 된다.
 * (globals.css 의 --color-burr / --color-line 과 같은 값)
 */
const BAR = '#6F9A57';
const GRID = '#ECE2D2';
const AXIS_TEXT = '#A89887';

/** 축 눈금은 짧게. 만원/천원 단위로 접어서 모바일 폭에 맞춘다. */
function compactWon(value: number): string {
  if (value === 0) return '0';
  if (value >= 10000) return `${Math.round(value / 10000)}만`;
  return `${Math.round(value / 1000)}천`;
}

/* ────────────────────────────────────────────────────────────
 * 최근 7일 매출 — 시간 축이 있어 막대 차트가 맞는다
 * ──────────────────────────────────────────────────────────── */

export function DailySalesChart({ data }: { data: DailySales[] }) {
  const hasSales = data.some((d) => d.amount > 0);

  return (
    <section className="card px-4 py-4">
      <h3 className="font-display text-[1.1rem]">최근 7일 매출</h3>

      {!hasSales ? (
        <p className="py-8 text-center text-[0.9rem] text-ink-soft">
          최근 7일간 입금 확인된 주문이 없습니다.
        </p>
      ) : (
        <>
          <div className="mt-3 h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
                {/* 격자는 가로선만, 눈에 띄지 않게 */}
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={compactWon}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fill: AXIS_TEXT, fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(111,154,87,0.08)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as DailySales;
                    return (
                      <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-md">
                        <p className="text-[0.78rem] text-ink-soft">{label}</p>
                        <p className="tnum text-[0.95rem] font-bold">{formatKRW(row.amount)}</p>
                        <p className="tnum text-[0.75rem] text-ink-faint">주문 {row.count}건</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="amount" fill={BAR} radius={[4, 4, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 화면 낭독기와 색 구분이 어려운 경우를 위한 표 */}
          <table className="sr-only">
            <caption>최근 7일 일별 매출</caption>
            <thead>
              <tr>
                <th>날짜</th>
                <th>매출</th>
                <th>주문 건수</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date}>
                  <td>{d.label}</td>
                  <td>{formatKRW(d.amount)}</td>
                  <td>{d.count}건</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
 * 상품별 판매량
 *
 * 여기는 차트 라이브러리를 쓰지 않는다.
 * 품목이 9개고 이름이 한글 두세 단어라 세로 막대에 넣으면 축 글자가 겹친다.
 * 이름·막대·수량을 한 줄에 놓으면 그 자체로 표이자 그래프라, 폰에서 손가락을 올리지
 * 않아도 값이 다 보인다. 마우스가 없는 화면에서 툴팁에 값을 숨기는 것보다 낫다.
 * ──────────────────────────────────────────────────────────── */

export function ProductSalesBars({ data }: { data: ProductSales[] }) {
  const max = Math.max(...data.map((d) => d.qty), 1);

  return (
    <section className="card px-4 py-4">
      <h3 className="font-display text-[1.1rem]">상품별 판매량</h3>

      {data.length === 0 ? (
        <p className="py-8 text-center text-[0.9rem] text-ink-soft">아직 팔린 상품이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {data.map((row) => (
            <li key={row.name}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.9rem] font-semibold">{row.name}</span>
                <span className="tnum text-[0.85rem] text-ink-soft">
                  {row.qty}개 · {formatKRW(row.amount)}
                </span>
              </div>
              <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-burr-tint">
                <div
                  className="h-full rounded-full bg-burr"
                  style={{ width: `${Math.max(4, (row.qty / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
