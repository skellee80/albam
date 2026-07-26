import Link from 'next/link';

import { DepositTester, type PendingOrder } from '@/components/admin/DepositTester';
import { summarizeItems } from '@/lib/format';
import { listPendingPaymentOrders } from '@/lib/orders';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export default async function AdminDepositTestPage() {
  const [orders, settings] = await Promise.all([listPendingPaymentOrders(), getSettings()]);

  const pendingOrders: PendingOrder[] = orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    depositorName: o.depositorName,
    depositorPhone: o.depositorPhone,
    recipientName: o.recipient.name,
    phone: o.recipient.phone,
    totalAmount: o.totalAmount,
    itemsSummary: summarizeItems(o.items),
  }));

  return (
    <div>
      <Link href="/admin/settings" className="text-[0.88rem] text-ink-soft underline underline-offset-2">
        ← 설정
      </Link>

      <h1 className="mt-2 px-1 font-display text-[1.4rem]">입금 문자 테스트</h1>
      <p className="mt-1 px-1 text-[0.88rem] leading-snug text-ink-soft">
        은행 문자를 기다리지 않고, 입금이 들어왔을 때 어떻게 처리되는지 확인합니다.
      </p>

      <DepositTester pendingOrders={pendingOrders} accountBank={settings.bankName} />
    </div>
  );
}
