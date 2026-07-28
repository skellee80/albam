'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';

import { createDirectOrderAction } from '@/app/admin/actions';
import { formatKRW } from '@/lib/format';

import { NoticeDialog } from './NoticeDialog';
import { QtyStepper } from './QtyStepper';

export type SellableProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

/** 단가는 상품의 기본값에서 시작하되 고칠 수 있다 — 장터에서 깎아 파는 일이 있다. */
type Line = { productId: string; qty: number; price: number };

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

  const [depositorName, setDepositorName] = useState('');
  const [depositorPhone, setDepositorPhone] = useState('');
  // 손님 주문서와 같은 규칙으로 기본은 꺼둔다. 켠 채로 두면 확인 없이 넘어가
  // 엉뚱한 사람 이름으로 저장되기 쉽다.
  const [sameAsDepositor, setSameAsDepositor] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [memo, setMemo] = useState('');
  const [paid, setPaid] = useState(true);
  const [lines, setLines] = useState<Line[]>(() =>
    products[0] ? [{ productId: products[0].id, qty: 1, price: products[0].price }] : [],
  );

  const [error, setError] = useState<string | null>(null);
  const [shortage, setShortage] = useState<Shortage | null>(null);
  const [done, setDone] = useState<{ orderNo: string; totalAmount: number } | null>(null);

  // "받는 분이 입금하는 분과 같습니다"가 켜져 있으면 이름과 연락처를 그대로 따라간다.
  useEffect(() => {
    if (!sameAsDepositor) return;
    setRecipientName(depositorName);
    setRecipientPhone(depositorPhone);
  }, [sameAsDepositor, depositorName, depositorPhone]);

  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

  function setLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  /** 상품을 바꾸면 단가도 그 상품의 기본값으로 따라간다 */
  function changeProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    setLine(index, { productId, price: product?.price ?? 0 });
  }

  function addLine() {
    const first = products[0];
    if (!first) return;
    setLines((prev) => [...prev, { productId: first.id, qty: 1, price: first.price }]);
  }

  function submit() {
    setError(null);

    if (!depositorName.trim()) {
      setError('입금자 이름을 넣어 주세요.');
      return;
    }
    if (lines.length === 0 || lines.every((l) => l.qty <= 0)) {
      setError('상품과 수량을 넣어 주세요.');
      return;
    }

    startTransition(async () => {
      const result = await createDirectOrderAction({
        depositorName,
        depositorPhone,
        sameAsDepositor,
        recipientName,
        recipientPhone,
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
            const discounted = product ? line.price !== product.price : false;

            return (
              <div key={index} className="rounded-xl border border-line px-3 py-3">
                <select
                  className="field"
                  value={line.productId}
                  onChange={(e) => changeProduct(index, e.target.value)}
                  aria-label={`${index + 1}번째 상품`}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatKRW(p.price)} (재고 {p.stock})
                    </option>
                  ))}
                </select>

                <div className="mt-2.5">
                  <label className="label text-[0.78rem]">수량</label>
                  <QtyStepper
                    value={line.qty}
                    max={product?.stock}
                    onChange={(qty) => setLine(index, { qty })}
                    label={`${product?.name ?? ''} 수량`}
                  />
                </div>

                <div className="mt-2.5">
                  <label className="label text-[0.78rem]">
                    단가 <span className="font-normal text-ink-faint">(깎아 팔았으면 고치세요)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      className="field tnum flex-1"
                      value={line.price}
                      onChange={(e) =>
                        setLine(index, {
                          price: Number(e.target.value.replace(/[^\d]/g, '')) || 0,
                        })
                      }
                      inputMode="numeric"
                      aria-label={`${product?.name ?? ''} 단가`}
                    />
                    {discounted && product && (
                      <button
                        type="button"
                        onClick={() => setLine(index, { price: product.price })}
                        className="shrink-0 text-[0.8rem] text-burr-deep underline underline-offset-2"
                      >
                        원래대로
                      </button>
                    )}
                  </div>
                  {discounted && product && (
                    <p className="tnum mt-1 text-[0.78rem] text-ink-soft">
                      정가 {formatKRW(product.price)}
                    </p>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
                  <span className="tnum text-[0.95rem] font-semibold">
                    {formatKRW(line.price * line.qty)}
                  </span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                      className="shrink-0 text-[0.82rem] text-berry underline underline-offset-2"
                    >
                      이 상품 빼기
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
        <h2 className="font-display text-[1.1rem]">돈 낸 분</h2>
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">
          이름만 있으면 됩니다. 나머지는 비워 두어도 됩니다.
        </p>

        <div className="mt-3.5">
          <label className="label" htmlFor="depositorName">
            입금자 이름
          </label>
          <input
            id="depositorName"
            className="field"
            value={depositorName}
            onChange={(e) => setDepositorName(e.target.value)}
            placeholder="예: 김순자"
          />
        </div>

        <label className="label mt-4" htmlFor="depositorPhone">
          입금자 연락처 <span className="font-normal text-ink-faint">(없어도 됩니다)</span>
        </label>
        <input
          id="depositorPhone"
          className="field tnum"
          value={depositorPhone}
          onChange={(e) => setDepositorPhone(e.target.value)}
          inputMode="tel"
          placeholder="010-0000-0000"
        />
      </section>

      <section className="card px-4 py-4">
        <h2 className="font-display text-[1.1rem]">택배 받는 분</h2>
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">
          만나서 바로 드렸으면 비워 두세요.
        </p>

        {/* 손님 주문서와 같은 자리, 같은 문구를 쓴다 — 두 화면이 같은 동작을 하도록 */}
        <label className="mt-3.5 flex cursor-pointer items-center gap-3 rounded-xl bg-burr-tint px-3.5 py-3">
          <input
            type="checkbox"
            checked={sameAsDepositor}
            onChange={(e) => setSameAsDepositor(e.target.checked)}
            className="h-5 w-5 accent-[#6F9A57]"
          />
          <span className="text-[0.9rem] font-semibold text-burr-deep">
            받는 분이 입금하는 분과 같습니다
          </span>
        </label>

        <label className="label mt-4" htmlFor="recipientName">
          받는 분 이름
        </label>
        <input
          id="recipientName"
          className="field"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          disabled={sameAsDepositor}
        />

        <label className="label mt-4" htmlFor="recipientPhone">
          받는 분 연락처
        </label>
        <input
          id="recipientPhone"
          className="field tnum"
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
          inputMode="tel"
          disabled={sameAsDepositor}
        />

        <label className="label mt-4" htmlFor="address">
          받는 곳 주소
        </label>
        <textarea
          id="address"
          className="field min-h-20 resize-none"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="택배로 보낼 것이면 적어 주세요"
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
              <b className="text-ink">{depositorName}</b> ·{' '}
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
