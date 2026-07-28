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
 * 색은 두 가지만 쓴다 — 주문이 **어디서 왔는지**가 유일하게 나눌 값이기 때문이다.
 * 초록은 사이트가 스스로 받아온 것, 갈색은 아버지가 손으로 넣은 것.
 * (globals.css 의 --color-burr / --color-shell 과 같은 값)
 */
const ONLINE = '#6F9A57';
const DIRECT = '#8C5A34';
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

      {/*
        범례를 recharts <Legend> 대신 직접 그린다.
        기본 범례는 글씨가 작고 위치를 맞추기 번거로운데, 여기서는 이 두 줄이
        차트에서 가장 먼저 읽혀야 하는 정보라 제목 바로 아래 크게 둔다.
      */}
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.82rem]">
        <LegendKey color={ONLINE} label="인터넷 판매" />
        <LegendKey color={DIRECT} label="직접 판매" />
      </div>

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
                        <dl className="mt-1 space-y-0.5 text-[0.75rem]">
                          <TipRow color={ONLINE} label="인터넷 판매" value={row.online} />
                          <TipRow color={DIRECT} label="직접 판매" value={row.direct} />
                        </dl>
                        <p className="tnum mt-1 text-[0.72rem] text-ink-faint">
                          주문 {row.count}건
                        </p>
                      </div>
                    );
                  }}
                />
                {/*
                  같은 stackId 를 줘서 하루치가 한 막대로 쌓인다.
                  나란히 두면 막대가 14개가 되어 폰 폭에서 서로 붙어 버린다.
                  둥근 모서리는 맨 위 조각에만 준다 — 아래 조각에도 주면 사이가 갈라져 보인다.
                */}
                <Bar dataKey="online" stackId="sales" fill={ONLINE} maxBarSize={38} />
                <Bar
                  dataKey="direct"
                  stackId="sales"
                  fill={DIRECT}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 화면 낭독기와 색 구분이 어려운 경우를 위한 표 */}
          <table className="sr-only">
            <caption>최근 7일 일별 매출</caption>
            <thead>
              <tr>
                <th>날짜</th>
                <th>인터넷 판매</th>
                <th>직접 판매</th>
                <th>합계</th>
                <th>주문 건수</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.date}>
                  <td>{d.label}</td>
                  <td>{formatKRW(d.online)}</td>
                  <td>{formatKRW(d.direct)}</td>
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

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="h-3 w-3 shrink-0 rounded-[3px]"
        style={{ background: color }}
      />
      <span className="text-ink-soft">{label}</span>
    </span>
  );
}

function TipRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={{ background: color }}
      />
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tnum ml-auto font-semibold">{formatKRW(value)}</dd>
    </div>
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
  // 막대 길이와 줄 순서 모두 **금액** 기준이다.
  // 개수로 재면 싸고 가벼운 4kg이 늘 맨 위로 올라와, 무엇이 돈이 되는지가 가려진다.
  const max = Math.max(...data.map((d) => d.amount), 1);

  return (
    <section className="card px-4 py-4">
      <h3 className="font-display text-[1.1rem]">상품별 판매 금액</h3>

      {/* 최근 7일 매출과 같은 색·같은 범례를 쓴다. 두 차트가 같은 이야기를 한다는 표시다. */}
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.82rem]">
        <LegendKey color={ONLINE} label="인터넷 판매" />
        <LegendKey color={DIRECT} label="직접 판매" />
      </div>

      {data.length === 0 ? (
        <p className="py-8 text-center text-[0.9rem] text-ink-soft">아직 팔린 상품이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {data.map((row) => (
            <li key={row.name}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[0.9rem] font-semibold">{row.name}</span>
                <span className="tnum shrink-0 text-[0.85rem]">
                  <b>{formatKRW(row.amount)}</b>
                  <span className="ml-1.5 text-ink-faint">{row.qty}개</span>
                </span>
              </div>

              {/*
                한 막대 안에 두 조각을 이어 붙인다. 전체 길이는 이 상품의 총액이고,
                그 안에서 인터넷과 직접이 갈린다 — 위 일별 매출 막대와 읽는 법이 같다.
                막대 폭은 가장 많이 판 상품을 100%로 잡는다.
              */}
              <div
                className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-burr-tint"
                title={`인터넷 판매 ${formatKRW(row.online)} · 직접 판매 ${formatKRW(row.direct)}`}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${(row.online / max) * 100}%`,
                    background: ONLINE,
                  }}
                />
                <div
                  className="h-full"
                  style={{
                    width: `${(row.direct / max) * 100}%`,
                    background: DIRECT,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 색을 못 가리는 경우에도 값이 전해지도록 */}
      {data.length > 0 && (
        <table className="sr-only">
          <caption>상품별 판매 금액</caption>
          <thead>
            <tr>
              <th>상품</th>
              <th>인터넷 판매</th>
              <th>직접 판매</th>
              <th>합계</th>
              <th>수량</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{formatKRW(row.online)}</td>
                <td>{formatKRW(row.direct)}</td>
                <td>{formatKRW(row.amount)}</td>
                <td>{row.qty}개</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
