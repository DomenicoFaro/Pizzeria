import type { OrderWithItems } from "./types";

/** Supabase restituisce i numeric come stringhe in alcuni casi: normalizzo */
export function normalizeOrder<T extends OrderWithItems>(o: T): T {
  return {
    ...o,
    subtotal: Number(o.subtotal),
    delivery_fee: Number(o.delivery_fee),
    discount: Number(o.discount),
    total: Number(o.total),
    change_for: o.change_for == null ? null : Number(o.change_for),
    order_items: (o.order_items ?? []).map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
  };
}
