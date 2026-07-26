'use client';

import { useState, useTransition } from 'react';

import { previewDepositAction, sendTestDepositAction } from '@/app/admin/actions';
import type { DepositPreview } from '@/lib/deposits';
import { formatKRW } from '@/lib/format';

/** 입금대기 주문 — 여기서 값을 골라 넣으면 오타 없이 테스트할 수 있다 */
export type PendingOrder = {
  id: string;
  orderNo: string;
  depositorName: string;
  depositorPhone: string;
  recipientName: string;
  phone: string;
  totalAmount: number;
  itemsSummary: string;
};

type Outcome =
  | { kind: 'preview'; preview: DepositPreview }
  | { kind: 'sent'; status: string | null; message: string; duplicate: boolean }
  | { kind: 'error'; error: string };

export function DepositTester({
  pendingOrders,
  accountBank,
}: {
  pendingOrders: PendingOrder[];
  accountBank: string;
}) {
  const [depositorName, setDepositorName] = useState('');
  const [amount, setAmount] = useState('');
  // 판매 계좌의 은행을 기본값으로 둔다. 다른 은행을 넣으면 일부러 어긋나게 해볼 수 있다.
  const [bankName, setBankName] = useState(accountBank);
  const [phoneFilter, setPhoneFilter] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, startTransition] = useTransition();

  const input = { amount, depositorName, bankName };

  function preview() {
    setOutcome(null);
    startTransition(async () => {
      const res = await previewDepositAction(input);
      setOutcome(res.ok ? { kind: 'preview', preview: res.preview } : { kind: 'error', error: res.error });
    });
  }

  function send() {
    if (
      !window.confirm(
        '실제 입금이 온 것처럼 처리합니다.\n맞는 주문이 있으면 발송대기로 바뀝니다.\n계속할까요?',
      )
    ) {
      return;
    }
    setOutcome(null);
    startTransition(async () => {
      const res = await sendTestDepositAction(input);
      setOutcome(
        res.ok
          ? {
              kind: 'sent',
              status: res.result.status,
              message: res.result.message,
              duplicate: res.result.duplicate,
            }
          : { kind: 'error', error: res.error },
      );
    });
  }

  const digits = phoneFilter.replace(/\D/g, '');
  const filtered = digits
    ? pendingOrders.filter(
        (o) =>
          o.phone.replace(/\D/g, '').includes(digits) ||
          o.depositorPhone.replace(/\D/g, '').includes(digits),
      )
    : pendingOrders;

  return (
    <div className="mt-4 space-y-5">
      <section className="card px-4 py-4">
        <h2 className="font-display text-[1.1rem]">문자에서 뽑은 값</h2>
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">
          MacroDroid가 서버로 보내는 값은 이 세 가지뿐입니다. 그대로 넣어 보세요.
        </p>

        <div className="mt-3.5 space-y-3">
          <div>
            <label className="label" htmlFor="testName">
              입금자명
            </label>
            <input
              id="testName"
              className="field"
              value={depositorName}
              onChange={(e) => setDepositorName(e.target.value)}
              placeholder="홍길동"
            />
          </div>

          <div>
            <label className="label" htmlFor="testAmount">
              입금액
            </label>
            <input
              id="testAmount"
              className="field tnum"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50,000원 처럼 넣어도 됩니다"
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="label" htmlFor="testBank">
              은행
            </label>
            <input
              id="testBank"
              className="field"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder={accountBank}
            />
            <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-soft">
              판매 계좌는 <b>{accountBank}</b> 입니다. 다른 은행에서 온 입금은 우리 계좌 입금이
              아니므로 매칭하지 않습니다.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={preview}
            disabled={pending || !depositorName || !amount}
            className="btn btn-primary flex-1"
          >
            {pending ? '확인 중…' : '결과 미리보기'}
          </button>
          <button
            type="button"
            onClick={send}
            disabled={pending || !depositorName || !amount}
            className="btn btn-outline px-5"
          >
            실제로 처리
          </button>
        </div>

        <p className="mt-2 text-[0.78rem] leading-snug text-ink-faint">
          <b>미리보기</b>는 아무것도 바꾸지 않고 결과만 보여줍니다.
          <b> 실제로 처리</b>는 진짜 입금이 온 것과 똑같이 주문 상태를 바꿉니다.
        </p>
      </section>

      {outcome && <OutcomeCard outcome={outcome} />}

      <section className="card px-4 py-4">
        <h2 className="font-display text-[1.1rem]">
          입금대기 주문 <span className="tnum text-burr">{pendingOrders.length}</span>건
        </h2>
        <p className="mt-1 text-[0.82rem] leading-snug text-ink-soft">
          누르면 위 칸에 이름과 금액이 채워집니다.
        </p>

        {pendingOrders.length > 3 && (
          <input
            className="field mt-3"
            value={phoneFilter}
            onChange={(e) => setPhoneFilter(e.target.value)}
            placeholder="전화번호로 찾기"
            inputMode="tel"
            aria-label="전화번호로 주문 찾기"
          />
        )}

        {filtered.length === 0 ? (
          <p className="mt-3 rounded-xl bg-paper px-3.5 py-4 text-center text-[0.88rem] text-ink-soft">
            {pendingOrders.length === 0
              ? '입금대기 주문이 없습니다. 손님 화면에서 주문을 하나 넣어 보세요.'
              : '해당하는 주문이 없습니다.'}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {filtered.map((order) => (
              <li key={order.id}>
                <button
                  type="button"
                  onClick={() => {
                    setDepositorName(order.depositorName);
                    setAmount(String(order.totalAmount));
                    setOutcome(null);
                  }}
                  className="w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-left transition-colors hover:border-burr"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <b>{order.depositorName}</b>
                    <span className="tnum font-semibold text-shell">
                      {formatKRW(order.totalAmount)}
                    </span>
                  </span>
                  <span className="mt-1 flex items-baseline justify-between gap-2 text-[0.8rem] text-ink-soft">
                    <span className="truncate">{order.itemsSummary}</span>
                    <span className="tnum shrink-0">{order.depositorPhone || order.phone}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function OutcomeCard({ outcome }: { outcome: Outcome }) {
  if (outcome.kind === 'error') {
    return (
      <p role="alert" className="rounded-card bg-berry-tint px-4 py-3.5 text-[0.9rem] font-semibold text-berry">
        {outcome.error}
      </p>
    );
  }

  const isPreview = outcome.kind === 'preview';
  const status = isPreview ? outcome.preview.status : outcome.status;
  const message = isPreview ? outcome.preview.message : outcome.message;
  const duplicate = isPreview ? outcome.preview.duplicate : outcome.duplicate;

  const tone =
    status === '확정'
      ? 'border-burr/40 bg-burr-tint'
      : status === '확인필요'
        ? 'border-amber/40 bg-amber-tint'
        : 'border-berry/35 bg-berry-tint';

  return (
    <section className={`rounded-card border-2 px-4 py-4 ${tone}`}>
      <p className="text-[0.78rem] font-bold tracking-wide text-ink-soft">
        {isPreview ? '미리보기 — 아무것도 바뀌지 않았습니다' : '처리했습니다 — 주문 상태가 바뀌었습니다'}
      </p>

      {/* MacroDroid 알림에 뜨는 문구 그대로 */}
      <p className="mt-2.5 rounded-xl bg-surface px-3.5 py-3 text-[0.95rem] leading-snug font-semibold">
        {message}
      </p>

      {duplicate && (
        <p className="mt-2.5 text-[0.83rem] leading-snug text-ink-soft">
          같은 입금이 최근 2분 안에 이미 들어와 있어 중복으로 처리됩니다. 금액이나 이름을 조금
          바꾸거나 2분 뒤에 다시 해보세요.
        </p>
      )}

      {isPreview && outcome.preview.candidates.length > 0 && (
        <div className="mt-3">
          <p className="text-[0.8rem] font-semibold text-ink-soft">맞아떨어진 주문</p>
          <ul className="mt-1.5 space-y-1 text-[0.85rem]">
            {outcome.preview.candidates.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span>
                  {c.recipientName} <span className="tnum text-ink-faint">{c.orderNo}</span>
                </span>
                <span className="tnum text-ink-soft">{c.phone}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isPreview && status === '미매칭' && (
        <p className="mt-3 text-[0.83rem] leading-snug text-ink-soft">
          입금자명과 금액이 <b>둘 다</b> 정확히 맞는 입금대기 주문이 없습니다. 아래 목록에서 주문을
          눌러 값을 채워 보세요.
        </p>
      )}
    </section>
  );
}
