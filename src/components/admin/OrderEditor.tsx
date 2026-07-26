'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  deleteOrderAction,
  restoreOrderAction,
  updateOrderAction,
} from '@/app/admin/actions';
import { formatDateTime, formatKRW } from '@/lib/format';
import { ORDER_STATUSES, type OrderItem, type OrderStatus } from '@/lib/types';

export type EditableOrder = {
  id: string;
  orderNo: string;
  recipient: { name: string; phone: string; address: string };
  depositorName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  trackingNo: string;
  memo: string;
  refundAmount: number;
  deleted: boolean;
  createdAt: number;
  paidAt: number | null;
  shippedAt: number | null;
};

export type ProductOption = { id: string; name: string; price: number };

/**
 * 주문 전체 수정.
 *
 * 합계는 입력할 수 없다 — 품목·수량·단가에서 항상 다시 계산한다.
 * 화면에서 계산한 값은 표시용이고, 저장되는 값은 서버가 같은 규칙으로 다시 계산한다.
 */
export function OrderEditor({
  order,
  products,
}: {
  order: EditableOrder;
  products: ProductOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const [name, setName] = useState(order.recipient.name);
  const [phone, setPhone] = useState(order.recipient.phone);
  const [address, setAddress] = useState(order.recipient.address);
  const [depositorName, setDepositorName] = useState(order.depositorName);
  const [items, setItems] = useState<OrderItem[]>(order.items);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [trackingNo, setTrackingNo] = useState(order.trackingNo);
  const [memo, setMemo] = useState(order.memo);
  const [refundAmount, setRefundAmount] = useState(String(order.refundAmount || ''));

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  function updateItem(index: number, patch: Partial<OrderItem>) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        return { ...next, subtotal: next.price * next.qty };
      }),
    );
  }

  function addItem() {
    const first = products[0];
    if (!first) return;
    setItems((prev) => [
      ...prev,
      { productId: first.id, name: first.name, price: first.price, qty: 1, subtotal: first.price },
    ]);
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateOrderAction(order.id, {
        recipient: { name, phone, address },
        depositorName,
        items: items.map((i) => ({ ...i, subtotal: i.price * i.qty })),
        status,
        trackingNo,
        memo,
        refundAmount: Number(refundAmount.replace(/[^\d]/g, '')) || 0,
      });
      setMessage(
        result.ok
          ? { kind: 'ok', text: '저장했습니다.' }
          : { kind: 'error', text: result.error },
      );
      if (result.ok) router.refresh();
    });
  }

  function remove() {
    if (!window.confirm('이 주문을 삭제할까요?\n고객 배송조회에서 사라지고, 재고는 되돌아갑니다.')) return;
    startTransition(async () => {
      const result = await deleteOrderAction(order.id);
      if (result.ok) router.push('/admin/orders');
      else setMessage({ kind: 'error', text: result.error });
    });
  }

  function restore() {
    startTransition(async () => {
      const result = await restoreOrderAction(order.id);
      if (result.ok) router.refresh();
      else setMessage({ kind: 'error', text: result.error });
    });
  }

  return (
    <div className="space-y-5">
      {order.deleted && (
        <div className="rounded-card border-2 border-berry/30 bg-berry-tint px-4 py-3.5">
          <p className="font-semibold text-berry">삭제된 주문입니다.</p>
          <button type="button" onClick={restore} disabled={pending} className="btn btn-outline mt-2.5 w-full min-h-11">
            되살리기
          </button>
        </div>
      )}

      {/* 진행 기록 */}
      <section className="card px-4 py-3.5">
        <dl className="space-y-1 text-[0.85rem]">
          <Row label="주문번호" value={order.orderNo} mono />
          <Row label="주문 시각" value={formatDateTime(order.createdAt)} />
          {order.paidAt && <Row label="입금 확인" value={formatDateTime(order.paidAt)} />}
          {order.shippedAt && <Row label="발송" value={formatDateTime(order.shippedAt)} />}
        </dl>
      </section>

      {/* 상태 */}
      <Section title="상태">
        <label className="label" htmlFor="status">
          진행 상태
        </label>
        <select
          id="status"
          className="field"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-soft">
          취소·환불완료로 바꾸면 재고가 자동으로 되돌아갑니다. 다시 되돌리면 재고도 함께 돌아갑니다.
        </p>

        <label className="label mt-4" htmlFor="trackingNo">
          송장번호
        </label>
        <input
          id="trackingNo"
          className="field tnum"
          value={trackingNo}
          onChange={(e) => setTrackingNo(e.target.value)}
          inputMode="numeric"
          placeholder="우체국 송장번호"
        />
      </Section>

      {/* 품목 */}
      <Section title="주문 상품">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="rounded-xl border border-line px-3 py-3">
              <select
                className="field"
                value={item.productId}
                onChange={(e) => {
                  const product = products.find((p) => p.id === e.target.value);
                  if (product) {
                    updateItem(index, {
                      productId: product.id,
                      name: product.name,
                      price: product.price,
                    });
                  }
                }}
                aria-label={`${index + 1}번째 상품`}
              >
                {products.some((p) => p.id === item.productId) ? null : (
                  <option value={item.productId}>{item.name} (삭제된 상품)</option>
                )}
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <div className="mt-2 flex gap-2">
                <div className="flex-1">
                  <label className="label text-[0.78rem]">단가</label>
                  <input
                    className="field tnum"
                    value={item.price}
                    onChange={(e) =>
                      updateItem(index, { price: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })
                    }
                    inputMode="numeric"
                  />
                </div>
                <div className="w-24">
                  <label className="label text-[0.78rem]">수량</label>
                  <input
                    className="field tnum"
                    value={item.qty}
                    onChange={(e) =>
                      updateItem(index, { qty: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })
                    }
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="tnum text-[0.88rem] font-semibold">
                  {formatKRW(item.price * item.qty)}
                </span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  className="text-[0.82rem] text-berry underline underline-offset-2"
                >
                  이 상품 빼기
                </button>
              </div>
            </div>
          ))}
        </div>

        <button type="button" onClick={addItem} className="btn btn-quiet mt-3 w-full min-h-11 text-[0.9rem]">
          상품 추가
        </button>

        <div className="mt-3 flex items-baseline justify-between rounded-xl bg-flesh/40 px-3.5 py-3">
          <span className="font-semibold">합계 (자동 계산)</span>
          <span className="tnum text-[1.15rem] font-bold text-shell">{formatKRW(total)}</span>
        </div>
      </Section>

      {/* 사람 */}
      <Section title="입금자 · 받는 분">
        <label className="label" htmlFor="depositor">
          입금자명
        </label>
        <input
          id="depositor"
          className="field"
          value={depositorName}
          onChange={(e) => setDepositorName(e.target.value)}
        />
        <p className="mt-1.5 text-[0.8rem] text-ink-soft">
          입금자명을 고치면 이후 들어오는 입금 문자와의 자동 매칭 기준도 바뀝니다.
        </p>

        <label className="label mt-4" htmlFor="name">
          받는 분 이름
        </label>
        <input id="name" className="field" value={name} onChange={(e) => setName(e.target.value)} />

        <label className="label mt-4" htmlFor="phone">
          연락처
        </label>
        <input
          id="phone"
          className="field tnum"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
        />

        <label className="label mt-4" htmlFor="address">
          주소
        </label>
        <textarea
          id="address"
          className="field min-h-24 resize-none"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </Section>

      {/* 환불·교환 */}
      <Section title="환불 · 교환 메모">
        <label className="label" htmlFor="refund">
          환불한 금액
        </label>
        <input
          id="refund"
          className="field tnum"
          value={refundAmount}
          onChange={(e) => setRefundAmount(e.target.value)}
          inputMode="numeric"
          placeholder="0"
        />
        <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-soft">
          무통장이라 실제 송금은 직접 하셔야 합니다. 보내신 뒤 금액을 적고 상태를 환불완료로 바꾸세요.
        </p>

        <label className="label mt-4" htmlFor="memo">
          메모 (고객도 봅니다)
        </label>
        <textarea
          id="memo"
          className="field min-h-20 resize-none"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: 밤 상태 문제로 교환 발송했습니다."
        />
      </Section>

      {message && (
        <p
          role="alert"
          className={`rounded-xl px-4 py-3 text-[0.9rem] font-semibold ${
            message.kind === 'ok' ? 'bg-burr-tint text-burr-deep' : 'bg-berry-tint text-berry'
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <button type="button" onClick={save} disabled={pending} className="btn btn-primary w-full text-[1.05rem]">
          {pending ? '저장 중…' : '저장하기'}
        </button>
        {!order.deleted && (
          <button type="button" onClick={remove} disabled={pending} className="btn btn-danger mt-2 w-full min-h-11 text-[0.9rem]">
            주문 삭제
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 font-display text-[1.15rem]">{title}</h2>
      <div className="card px-4 py-4">{children}</div>
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className={mono ? 'tnum' : undefined}>{value}</dd>
    </div>
  );
}
