import type { Metadata } from "next";
import { OrdersBoard } from "@/components/admin/OrdersBoard";
import { requireStaffPage } from "@/lib/auth";
import { normalizeOrder } from "@/lib/orders";
import { romeDateKey, romeToDate } from "@/lib/time";
import type { OrderWithItems } from "@/lib/types";

export const metadata: Metadata = { title: "Ordini live" };

export default async function OrdersPage() {
  const { sb } = await requireStaffPage();
  const startOfDay = romeToDate(romeDateKey(new Date()), 0).toISOString();
  const [active, today, settings] = await Promise.all([
    sb.from("orders").select("*, order_items(*)").in("status", ["nuovo", "accettato", "in_preparazione", "pronto", "in_consegna"]).order("scheduled_for"),
    sb.from("orders").select("*, order_items(*)").in("status", ["completato", "rifiutato", "annullato"]).gte("created_at", startOfDay).order("updated_at", { ascending: false }).limit(60),
    sb.from("settings").select("orders_paused").eq("id", 1).maybeSingle(),
  ]);
  const orders = [...(active.data ?? []), ...(today.data ?? [])].map((o) => normalizeOrder(o as OrderWithItems));
  return <OrdersBoard initialOrders={orders} initialPaused={Boolean(settings.data?.orders_paused)} />;
}
