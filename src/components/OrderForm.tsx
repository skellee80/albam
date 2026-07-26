'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { placeOrder, type PlaceOrderResult } from '@/app/(shop)/order/actions';
import { formatKRW } from '@/lib/format';
import type { OrderItem, Settings } from '@/lib/types';

import { useCart } from './CartProvider';

/** 주문 화면에서 참조하는 최신 상품 정보 (품절·가격 변동 확인용) */
export type OrderProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
  hidden: boolean;
};

type Completed = { orderNo: string; totalAmount: number; items: OrderItem[]; depositorName: string };

export function OrderForm({
  products,
  settings,
}: {
  products: OrderProduct[];
  settings: Settings;
}) {
  const { ready, items, setQty, remove, clear } = useCart();

  const [depositorName, setDepositorName] = useState('');
  const [sameAsDepositor, setSameAsDepositor] = useState(true);
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Completed | null>(null);
  const [pending, startTransition] = useTransition();

  // "입금자와 수령인 동일"이 켜져 있으면 입금자명을 그대로 따라간다.
  useEffect(() => {
    if (sameAsDepositor) setRecipientName(depositorName);
  }, [sameAsDepositor, depositorName]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  /** 장바구니를 서버의 현재 상품 정보와 맞춰본다. 값이 바뀌었으면 서버 쪽이 옳다. */
  const lines = useMemo(
    () =>
      items.map((item) => {
        const product = productById.get(item.productId);
        const unavailable = !product || product.hidden;
        const overStock = !!product && item.qty > product.stock;
        return {
          ...item,
          price: product?.price ?? item.price,
          name: product?.name ?? item.name,
          stock: product?.stock ?? 0,
          unavailable,
          overStock,
        };
      }),
    [items, productById],
  );

  const total = lines.reduce((sum, l) => (l.unavailable ? sum : sum + l.price * l.qty), 0);
  const blocked = lines.some((l) => l.unavailable || l.overStock);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result: PlaceOrderResult = await placeOrder({
        // 가격은 보내지 않는다 — 서버가 계산한다.
        lines: items.map((i) => ({ productId: i.productId, qty: i.qty })),
        depositorName,
        sameAsDepositor,
        recipient: { name: recipientName, phone, address },
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setCompleted({
        orderNo: result.orderNo,
        totalAmount: result.totalAmount,
        items: result.items,
        depositorName: depositorName.trim(),
      });
      clear();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (completed) {
    return <OrderComplete completed={completed} settings={settings} />;
  }

  if (!ready) {
    return <p className="py-16 text-center text-ink-faint">장바구니를 불러오는 중…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="card mt-6 px-5 py-12 text-center">
        <p className="text-ink-soft">담은 밤이 없습니다.</p>
        <Link href="/" className="btn btn-primary mt-5">
          밤 고르러 가기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6">
      {/* ── 담은 밤 ── */}
      <section>
        <h2 className="mb-2.5 px-1 font-display text-[1.15rem]">담은 밤</h2>
        <div className="card divide-y divide-line overflow-hidden">
          {lines.map((line) => (
            <div key={line.productId} className="px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{line.name}</span>
                <span className="tnum font-semibold">{formatKRW(line.price * line.qty)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex items-center rounded-full border border-line">
                  <button
                    type="button"
                    aria-label={`${line.name} 수량 줄이기`}
                    onClick={() => setQty(line.productId, line.qty - 1)}
                    className="h-9 w-9 rounded-full text-lg text-ink-soft"
                  >
                    −
                  </button>
                  <span className="tnum w-8 text-center text-sm font-semibold">{line.qty}</span>
                  <button
                    type="button"
                    aria-label={`${line.name} 수량 늘리기`}
                    onClick={() => setQty(line.productId, line.qty + 1)}
                    disabled={line.qty >= line.stock}
                    className="h-9 w-9 rounded-full text-lg text-ink-soft disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => remove(line.productId)}
                  className="text-[0.8rem] text-ink-faint underline underline-offset-2"
                >
                  빼기
                </button>
              </div>

              {line.unavailable && (
                <p className="mt-2 text-[0.8rem] font-semibold text-berry">
                  지금은 주문할 수 없는 상품입니다. 빼주세요.
                </p>
              )}
              {!line.unavailable && line.overStock && (
                <p className="mt-2 text-[0.8rem] font-semibold text-amber">
                  남은 수량이 {line.stock}개입니다. 수량을 줄여주세요.
                </p>
              )}
            </div>
          ))}

          <div className="flex items-baseline justify-between bg-flesh/40 px-4 py-3.5">
            <span className="font-semibold">합계</span>
            <span className="tnum text-[1.2rem] font-bold text-shell">{formatKRW(total)}</span>
          </div>
        </div>
      </section>

      {/* ── 입금자 ── */}
      <section>
        <h2 className="mb-2.5 px-1 font-display text-[1.15rem]">입금하실 분</h2>
        <div className="card space-y-4 px-4 py-4">
          <div>
            <label className="label" htmlFor="depositorName">
              입금자명
            </label>
            <input
              id="depositorName"
              className="field"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              placeholder="통장에 찍히는 이름"
              autoComplete="name"
              required
            />
            <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-soft">
              입금이 자동으로 확인되도록, 실제로 이체할 때 쓰는 이름과 똑같이 적어주세요.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-burr-tint px-3.5 py-3">
            <input
              type="checkbox"
              checked={sameAsDepositor}
              onChange={(e) => setSameAsDepositor(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[#6F9A57]"
            />
            <span className="text-[0.92rem] font-semibold text-burr-deep">
              받는 분이 입금하는 분과 같습니다
            </span>
          </label>
        </div>
      </section>

      {/* ── 수령인 ── */}
      <section>
        <h2 className="mb-2.5 px-1 font-display text-[1.15rem]">받는 분</h2>
        <div className="card space-y-4 px-4 py-4">
          <div>
            <label className="label" htmlFor="recipientName">
              이름
            </label>
            <input
              id="recipientName"
              className="field disabled:bg-paper disabled:text-ink-soft"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              disabled={sameAsDepositor}
              placeholder="밤을 받으실 분"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="phone">
              연락처
            </label>
            <input
              id="phone"
              className="field tnum"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              inputMode="tel"
              autoComplete="tel"
              required
            />
            <p className="mt-1.5 text-[0.8rem] text-ink-soft">
              배송 조회에 쓰이니 정확히 적어주세요.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="address">
              주소
            </label>
            <textarea
              id="address"
              className="field min-h-24 resize-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="받으실 주소를 상세히 적어주세요"
              autoComplete="street-address"
              required
            />
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl bg-berry-tint px-4 py-3 text-[0.9rem] font-semibold text-berry">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending || blocked} className="btn btn-primary w-full text-[1.05rem]">
        {pending ? '주문 접수 중…' : `${formatKRW(total)} 주문하기`}
      </button>

      <p className="pb-4 text-center text-[0.8rem] text-ink-faint">
        주문 후 안내되는 계좌로 입금하시면 발송이 시작됩니다.
      </p>
    </form>
  );
}

/* ────────────────────────────────────────────────────────────
 * 완료 화면
 * ──────────────────────────────────────────────────────────── */

function OrderComplete({ completed, settings }: { completed: Completed; settings: Settings }) {
  const [copied, setCopied] = useState(false);

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(settings.bankAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false); // 클립보드가 막힌 브라우저에서는 아래 계좌번호를 직접 보고 입력하면 된다
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="card px-5 py-6 text-center">
        <p className="text-[2rem] leading-none">🌰</p>
        <h2 className="mt-3 font-display text-[1.35rem]">주문이 접수되었습니다</h2>
        <p className="tnum mt-1.5 text-[0.9rem] text-ink-soft">주문번호 {completed.orderNo}</p>
      </div>

      {/* 입금 안내가 이 화면의 핵심이라 가장 눈에 띄게 둔다 */}
      <div className="rounded-card border-2 border-shell/25 bg-shell-tint px-5 py-5">
        <h3 className="font-display text-[1.1rem] text-shell">아래 계좌로 입금해 주세요</h3>

        <div className="mt-4 rounded-xl bg-surface px-4 py-4">
          <p className="text-[0.8rem] text-ink-soft">{settings.bankName}</p>
          <p className="tnum mt-1 text-[1.25rem] font-bold tracking-tight">
            {settings.bankAccount}
          </p>
          <p className="mt-1 text-[0.9rem] text-ink-soft">예금주 {settings.bankHolder}</p>

          <button type="button" onClick={copyAccount} className="btn btn-quiet mt-3 min-h-10 w-full text-sm">
            {copied ? '계좌번호를 복사했습니다' : '계좌번호 복사'}
          </button>
        </div>

        <dl className="mt-4 space-y-2 text-[0.95rem]">
          <div className="flex justify-between">
            <dt className="text-ink-soft">입금할 금액</dt>
            <dd className="tnum text-[1.15rem] font-bold text-shell">
              {formatKRW(completed.totalAmount)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">입금자명</dt>
            <dd className="font-semibold">{completed.depositorName}</dd>
          </div>
        </dl>

        <p className="mt-4 text-[0.83rem] leading-relaxed text-shell">
          입금자명이 <b>{completed.depositorName}</b> 과(와) 다르면 입금 확인이 늦어집니다.
          이체할 때 이름을 꼭 확인해 주세요.
        </p>
      </div>

      <div className="card px-5 py-4">
        <h3 className="text-[0.95rem] font-semibold">주문 내역</h3>
        <ul className="mt-2.5 space-y-1.5 text-[0.9rem]">
          {completed.items.map((item) => (
            <li key={item.productId} className="flex justify-between text-ink-soft">
              <span>
                {item.name} <span className="tnum">×{item.qty}</span>
              </span>
              <span className="tnum">{formatKRW(item.subtotal)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="rounded-xl bg-burr-tint px-4 py-3.5 text-[0.85rem] leading-relaxed text-burr-deep">
        입금이 확인되면 발송 준비가 시작됩니다. 진행 상태는 <b>배송 조회</b>에서
        입금자명과 연락처로 확인하실 수 있습니다. 문의 {settings.contactPhone}
      </p>

      <div className="flex gap-2 pb-6">
        <Link href="/track" className="btn btn-primary flex-1">
          배송 조회
        </Link>
        <Link href="/" className="btn btn-outline flex-1">
          더 주문하기
        </Link>
      </div>
    </div>
  );
}
