'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { createDirectOrderAction } from '@/app/admin/actions';
import { formatKRW } from '@/lib/format';

import { NoticeDialog } from './NoticeDialog';

export type SellableProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type Line = { productId: string; qty: number };

/** 모자란 재고를 알릴 때 쓰는 값 */
type Shortage = { name: string; stock: number; want: number };

/**
 * 전화 주문·방문 판매를 손으로 넣는 화면.
 *
 * 사이트를 거치지 않고 팔린 것도 **재고에서 빠져야** 한다. 안 그러면 손님 화면의
 * 남은 수량이 실제보다 많아지고, 이미 없는 밤을 주문받게 된다.
 *
 * 받는 것은 이름 하나뿐이다. 방문 판매에는 주소도 연락처도 없다.
 */
export function DirectOrderForm({ products }: { products: SellableProduct[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [paid, setPaid] = useState(true);
  const [lines, setLines] = useState<Line[]>(() =>
    products[0] ? [{ productId: products[0].id, qty: 1 }] : [],
  );

  const [error, setError] = useState<string | null>(null);
  const [shortage, setShortage] = useState<Shortage | null>(null);
  const [done, setDone] = useState<{ orderNo: string; totalAmount: number } | null>(null);

  const priceOf = (id: string) => products.find((p) => p.id === id)?.price ?? 0;
  const total = lines.reduce((sum, l) => sum + priceOf(l.productId) * l.qty, 0);

  function setLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    const first = products[0];
    if (!first) return;
    setLines((prev) => [...prev, { productId: first.id, qty: 1 }]);
  }

  function submit() {
    setError(null);

    if (!customerName.trim()) {
      setError('손님 이름을 넣어 주세요.');
      return;
    }
    if (lines.length === 0 || lines.every((l) => l.qty <= 0)) {
      setError('상품과 수량을 넣어 주세요.');
      return;
    }

    startTransition(async () => {
      const result = await createDirectOrderAction({
        customerName,
        phone,
        address,
        memo,
        paid,
        lines: lines.filter((l) => l.qty > 0),
      });

      if (!result.ok) {
        // 재고가 모자란 건 실수가 아니라 "먼저 할 일이 있다"는 뜻이라 따로 알린다
        if (result.shortage) setShortage(result.shortage);
        else setError(result.error);
        return;
      }

      setDone({ orderNo: result.orderNo, totalAmount: result.totalAmount });
    });
  }

  if (products.length === 0) {
    return (
      <p className="card mt-3 px-5 py-10 text-center text-ink-soft">
        먼저 재고관리에서 상품을 넣어 주세요.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-5">
      <section className="card px-4 py-4">
        <h2 className="font-display text-[1.1rem]">판 상품</h2>

        <div className="mt-3 space-y-3">
          {lines.map((line, index) => {
            const product = products.find((p) => p.id === line.productId);
            return (
              <div key={index} className="rounded-xl border border-line px-3 py-3">
                <select
                  className="field"
                  value={line.productId}
                  onChange={(e) => setLine(index, { productId: e.target.value })}
                  aria-label={`${index + 1}번째 상품`}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatKRW(p.price)} (재고 {p.stock})
                    </option>
                  ))}
                </select>

                <div className="mt-2 flex items-center gap-2">
                  <div className="w-28">
                    <label className="label text-[0.78rem]">수량</label>
                    <input
                      className="field tnum"
                      value={line.qty}
                      onChange={(e) =>
                        setLine(index, { qty: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })
                      }
                      inputMode="numeric"
                    />
                  </div>
                  <div className="flex-1 pt-6 text-right">
                    <span className="tnum text-[0.95rem] font-semibold">
                      {formatKRW(priceOf(line.productId) * line.qty)}
                    </span>
                  </div>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      className="mt-6 shrink-0 text-[0.82rem] text-berry underline underline-offset-2"
                    >
                      빼기
                    </button>
                  )}
                </div>

                {product && line.qty > product.stock && (
                  <p className="mt-2 rounded-lg bg-amber-tint px-3 py-2 text-[0.8rem] font-semibold text-amber">
                    재고가 {product.stock}개뿐입니다
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <button type="button" onClick={addLine} className="btn btn-quiet mt-3 min-h-11 w-full text-[0.9rem]">
          상품 추가
        </button>

        <div className="mt-3 flex items-baseline justify-between rounded-xl bg-flesh/40 px-3.5 py-3">
          <span className="font-semibold">합계 (자동 계산)</span>
          <span className="tnum text-[1.15rem] font-bold text-shell">{formatKRW(total)}</span>
        </div>
      </section>

      <section className="card px-4 py-4">
        <h2 className="font-display text-[1.1rem]">손님</h2>
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">
          이름만 있으면 됩니다. 택배로 보낼 것이면 연락처와 주소도 적어 주세요.
        </p>

        <div className="mt-3.5">
          <label className="label" htmlFor="customerName">
            이름
          </label>
          <input
            id="customerName"
            className="field"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="예: 김순자"
          />
        </div>

        <label className="label mt-4" htmlFor="phone">
          연락처 <span className="font-normal text-ink-faint">(없어도 됩니다)</span>
        </label>
        <input
          id="phone"
          className="field tnum"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          placeholder="010-0000-0000"
        />

        <label className="label mt-4" htmlFor="address">
          주소 <span className="font-normal text-ink-faint">(방문 판매면 비워 두세요)</span>
        </label>
        <textarea
          id="address"
          className="field min-h-20 resize-none"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <label className="label mt-4" htmlFor="memo">
          메모 <span className="font-normal text-ink-faint">(고객도 봅니다)</span>
        </label>
        <input
          id="memo"
          className="field"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 전화 주문 / 장터 방문 판매"
        />
      </section>

      <section className="card px-4 py-4">
        <h2 className="font-display text-[1.1rem]">돈</h2>
        <label className="mt-3 flex items-center gap-3 rounded-xl bg-paper px-3.5 py-3.5">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
            className="h-5 w-5 accent-[#6F9A57]"
          />
          <span>
            <span className="block text-[0.95rem] font-semibold">이미 돈을 받았습니다</span>
            <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-soft">
              {paid
                ? '발송대기로 넣고 매출에 바로 잡힙니다.'
                : '입금대기로 넣습니다. 입금이 확인되면 직접 발송대기로 바꿔 주세요.'}
            </span>
          </span>
        </label>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-berry-tint px-4 py-3 text-[0.9rem] font-semibold text-berry">
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn btn-primary w-full text-[1.05rem]"
        >
          {pending ? '넣는 중…' : `${formatKRW(total)} 주문 넣기`}
        </button>
      </div>

      {/* 재고가 모자랄 때 — 무엇을 얼마나 채워야 하는지까지 알려준다 */}
      <NoticeDialog
        open={shortage !== null}
        tone="warn"
        title="재고를 먼저 채워 주세요"
        closeLabel="알겠습니다"
        onClose={() => setShortage(null)}
      >
        {shortage && (
          <div className="space-y-2">
            <p>
              <b className="text-ink">{shortage.name}</b> 은(는) 지금{' '}
              <b className="tnum text-ink">{shortage.stock}개</b> 남았는데{' '}
              <b className="tnum text-ink">{shortage.want}개</b>를 넣으려 하셨습니다.
            </p>
            <p>
              <b className="text-ink">재고관리</b> 에서 수량을 채운 뒤 다시 넣어 주세요.
            </p>
            <Link href="/admin/products" className="btn btn-outline mt-1 min-h-11 w-full text-[0.9rem]">
              재고관리로 가기
            </Link>
          </div>
        )}
      </NoticeDialog>

      <NoticeDialog
        open={done !== null}
        title="주문을 넣었습니다"
        closeLabel="주문 목록으로"
        onClose={() => {
          setDone(null);
          router.push('/admin/orders');
        }}
      >
        {done && (
          <div className="space-y-1.5">
            <p>
              <b className="text-ink">{customerName}</b> ·{' '}
              <b className="tnum text-ink">{formatKRW(done.totalAmount)}</b>
            </p>
            <p className="tnum text-[0.83rem] text-ink-faint">주문번호 {done.orderNo}</p>
            <p>재고에서 빠졌고, 판매 현황에 &ldquo;직접 넣은 주문&rdquo;으로 잡힙니다.</p>
          </div>
        )}
      </NoticeDialog>
    </div>
  );
}
