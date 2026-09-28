import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, romeDateKey, romeToDate } from "./time";

export type ReportRange = { from: string; to: string }; // date locali YYYY-MM-DD incluse

export function resolveRange(period: string | undefined, from?: string, to?: string): ReportRange & { period: string } {
  const today = romeDateKey(new Date());
  const valid = (d?: string) => d && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (period === "custom" && valid(from) && valid(to)) return { period, from: from!, to: to! };
  if (period === "oggi") return { period, from: today, to: today };
  if (period === "30g") return { period, from: addDays(today, -29), to: today };
  if (period === "mese") return { period, from: `${today.slice(0, 7)}-01`, to: today };
  return { period: "7g", from: addDays(today, -6), to: today };
}

type OrderRow = {
  id: string;
  number: number;
  created_at: string;
  type: "pickup" | "delivery";
  status: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  order_items: { name: string; quantity: number; unit_price: number }[];
};

export async function loadOrders(sb: SupabaseClient, range: ReportRange) {
  const start = romeToDate(range.from, 0).toISOString();
  const end = romeToDate(addDays(range.to, 1), 0).toISOString();
  const { data, error } = await sb
    .from("orders")
    .select("id, number, created_at, type, status, total, subtotal, delivery_fee, discount, payment_method, payment_status, customer_name, order_items(name, quantity, unit_price)")
    .gte("created_at", start)
    .lt("created_at", end)
    .not("status", "in", "(in_attesa_pagamento,rifiutato,annullato)")
    .order("created_at");
  if (error) throw error;
  return ((data ?? []) as OrderRow[]).map((o) => ({ ...o, total: Number(o.total), subtotal: Number(o.subtotal), delivery_fee: Number(o.delivery_fee), discount: Number(o.discount) }));
}

export function summarize(orders: Awaited<ReturnType<typeof loadOrders>>) {
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const byDay = new Map<string, { revenue: number; count: number }>();
  const products = new Map<string, { qty: number; revenue: number }>();
  const byType = { pickup: { count: 0, revenue: 0 }, delivery: { count: 0, revenue: 0 } };
  const byPayment = new Map<string, number>();
  for (const o of orders) {
    const day = romeDateKey(new Date(o.created_at));
    const d = byDay.get(day) ?? { revenue: 0, count: 0 };
    d.revenue += o.total;
    d.count += 1;
    byDay.set(day, d);
    byType[o.type].count += 1;
    byType[o.type].revenue += o.total;
    byPayment.set(o.payment_method, (byPayment.get(o.payment_method) ?? 0) + o.total);
    for (const i of o.order_items) {
      const p = products.get(i.name) ?? { qty: 0, revenue: 0 };
      p.qty += i.quantity;
      p.revenue += i.quantity * Number(i.unit_price);
      products.set(i.name, p);
    }
  }
  return {
    revenue,
    count: orders.length,
    average: orders.length ? revenue / orders.length : 0,
    byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
    topProducts: [...products.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.qty - a.qty).slice(0, 15),
    byType,
    byPayment: [...byPayment.entries()],
  };
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // separatore ";" e BOM per aprirlo correttamente in Excel italiano
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\n");
}
