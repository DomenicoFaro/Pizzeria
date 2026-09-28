import type { OrderWithItems } from "./types";

/** Versione dell'ordine mostrata al cliente: niente telefono/email */
export function toPublicOrder(o: OrderWithItems) {
  return {
    id: o.id,
    number: o.number,
    type: o.type,
    status: o.status,
    status_reason: o.status_reason,
    asap: o.asap,
    scheduled_for: o.scheduled_for,
    estimated_ready_at: o.estimated_ready_at,
    first_name: o.customer_name.split(" ")[0],
    address: o.address ? { street: o.address.street, number: o.address.number, city: o.address.city } : null,
    subtotal: o.subtotal,
    delivery_fee: o.delivery_fee,
    discount: o.discount,
    discount_code: o.discount_code,
    total: o.total,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    created_at: o.created_at,
    items: o.order_items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit_price: i.unit_price,
      modifiers: i.modifiers,
      notes: i.notes,
    })),
  };
}

export type PublicOrder = ReturnType<typeof toPublicOrder>;
