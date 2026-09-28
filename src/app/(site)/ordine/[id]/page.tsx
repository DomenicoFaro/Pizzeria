import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderTracker } from "@/components/order/OrderTracker";
import { getOrderWithItems } from "@/lib/orders";
import { toPublicOrder } from "@/lib/public-order";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Il tuo ordine", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderPage({ params, searchParams }: PageProps<"/ordine/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID.test(id)) notFound();
  const order = await getOrderWithItems(id);
  if (!order) notFound();
  return (
    <div className="bg-farina px-4 pb-24 pt-[calc(var(--header-h)+2rem)] sm:px-6">
      <OrderTracker initial={toPublicOrder(order)} justPlaced={Boolean(sp.nuovo)} />
    </div>
  );
}
