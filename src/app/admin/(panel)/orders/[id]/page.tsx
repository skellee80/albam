import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OrderEditor, type ProductOption } from '@/components/admin/OrderEditor';
import { getOrder } from '@/lib/orders';
import { listProducts } from '@/lib/products';

export const dynamic = 'force-dynamic';

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [order, products] = await Promise.all([
    getOrder(id),
    listProducts({ includeHidden: true }),
  ]);

  if (!order) notFound();

  const productOptions: ProductOption[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
  }));

  return (
    <div>
      <Link href="/admin/orders" className="text-[0.88rem] text-ink-soft underline underline-offset-2">
        ← 주문 목록
      </Link>

      <h1 className="mt-2 px-1 font-display text-[1.4rem]">
        {order.recipient.name}님 주문
      </h1>

      <div className="mt-4">
        <OrderEditor
          order={{
            id: order.id,
            orderNo: order.orderNo,
            recipient: order.recipient,
            depositorName: order.depositorName,
            items: order.items,
            totalAmount: order.totalAmount,
            status: order.status,
            trackingNo: order.trackingNo,
            memo: order.memo,
            refundAmount: order.refundAmount,
            deleted: order.deleted,
            createdAt: order.createdAt,
            paidAt: order.paidAt,
            shippedAt: order.shippedAt,
          }}
          products={productOptions}
        />
      </div>
    </div>
  );
}
