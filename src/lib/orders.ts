import "server-only";
import { z } from "zod";
import { getClosures, getHours, getMenu, getSettings, getZones } from "./data";
import { geocodeAddress } from "./geocode";
import { applyDiscount, deliveryFee, formatEuro, priceLine, round2 } from "./pricing";
import { buildSlotPlan, isValidSlot, type SlotPlan } from "./schedule";
import { getServiceSupabase } from "./supabase/server";
import { findZone } from "./zones";
import { sendOrderConfirmation } from "./email";
import { normalizeOrder } from "./orders-client";

export { normalizeOrder };
import type {
  DeliveryZone,
  DiscountCode,
  MenuProduct,
  OrderItemModifier,
  OrderType,
  OrderWithItems,
  PaymentMethod,
} from "./types";

// ---------------------------------------------------------------------------
// Schemi di input
// ---------------------------------------------------------------------------
export const lineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  modifierIds: z.array(z.string().uuid()).max(30).default([]),
  removed: z.array(z.string().max(60)).max(20).default([]),
  notes: z.string().max(200).optional().default(""),
});

export const addressSchema = z.object({
  street: z.string().trim().min(2, "Inserisci la via").max(120),
  number: z.string().trim().min(1, "Inserisci il civico").max(12),
  city: z.string().trim().min(2, "Inserisci il comune").max(60),
  cap: z.string().trim().regex(/^\d{5}$/, "CAP non valido"),
  intercom: z.string().trim().max(60).optional().default(""),
  floor: z.string().trim().max(60).optional().default(""),
  notes: z.string().trim().max(200).optional().default(""),
});

export const quoteSchema = z.object({
  type: z.enum(["pickup", "delivery"]),
  lines: z.array(lineSchema).min(1, "Il carrello è vuoto").max(60),
  address: addressSchema.optional(),
  discountCode: z.string().trim().max(40).optional(),
});

export const orderSchema = quoteSchema.extend({
  asap: z.boolean(),
  slot: z.string().optional(),
  firstName: z.string().trim().min(1, "Inserisci il nome").max(60),
  lastName: z.string().trim().min(1, "Inserisci il cognome").max(60),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s./-]{8,20}$/, "Numero di telefono non valido"),
  email: z.string().trim().email("Email non valida").max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().default(""),
  // il pagamento avviene sempre alla consegna/al ritiro (contanti o POS)
  paymentMethod: z.enum(["cash", "pos"]),
  changeFor: z.number().min(0).max(500).optional().nullable(),
  acceptTerms: z.literal(true, { message: "Devi accettare termini e privacy" }),
  marketingConsent: z.boolean().optional().default(false),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type OrderInput = z.infer<typeof orderSchema>;

export class OrderError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Carico degli slot (pizze già ordinate per ogni slot)
// ---------------------------------------------------------------------------
export async function getSlotLoad(): Promise<Record<string, number>> {
  const sb = getServiceSupabase();
  const since = new Date(Date.now() - 3 * 3600_000).toISOString();
  const { data, error } = await sb
    .from("orders")
    .select("scheduled_for, pizza_count, status, created_at")
    .gte("scheduled_for", since)
    .not("status", "in", "(rifiutato,annullato)");
  if (error) throw error;
  const load: Record<string, number> = {};
  for (const o of data ?? []) {
    const key = new Date(o.scheduled_for).toISOString();
    load[key] = (load[key] ?? 0) + (o.pizza_count ?? 0);
  }
  return load;
}

export async function getSlotPlan(type: OrderType, pizzas: number): Promise<SlotPlan> {
  const [settings, hours, closures, load] = await Promise.all([getSettings(), getHours(), getClosures(), getSlotLoad()]);
  return buildSlotPlan({ now: new Date(), type, hours, closures, settings, load, pizzas });
}

// ---------------------------------------------------------------------------
// Preventivo: ricalcolo prezzi, zona, sconto
// ---------------------------------------------------------------------------
export type PricedLine = {
  product: MenuProduct;
  quantity: number;
  unitPrice: number;
  modifiers: OrderItemModifier[];
  notes: string;
  countsForCapacity: boolean;
};

export type Quote = {
  lines: PricedLine[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  discountLabel: string | null;
  discountError: string | null;
  total: number;
  pizzaCount: number;
  zone: DeliveryZone | null;
  geo: { lat: number; lng: number } | null;
  minOrder: number;
  missingForMinimum: number;
};

export async function computeQuote(input: QuoteInput): Promise<Quote> {
  const sb = getServiceSupabase();
  const [menu, zones] = await Promise.all([getMenu({ client: sb }), getZones(sb)]);
  const products = new Map<string, { p: MenuProduct; counts: boolean }>();
  for (const c of menu) for (const p of c.products) products.set(p.id, { p, counts: c.counts_for_capacity && c.is_active });

  const lines: PricedLine[] = [];
  for (const l of input.lines) {
    const entry = products.get(l.productId);
    if (!entry) throw new OrderError("Un prodotto nel carrello non è più disponibile. Aggiorna il carrello.");
    const r = priceLine(entry.p, l.modifierIds, l.removed);
    if (!r.ok) throw new OrderError(r.error);
    lines.push({
      product: entry.p,
      quantity: l.quantity,
      unitPrice: r.unitPrice,
      modifiers: r.modifiers,
      notes: l.notes ?? "",
      countsForCapacity: entry.counts,
    });
  }

  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const pizzaCount = lines.filter((l) => l.countsForCapacity).reduce((s, l) => s + l.quantity, 0);

  let zone: DeliveryZone | null = null;
  let geo: { lat: number; lng: number } | null = null;
  if (input.type === "delivery") {
    if (!input.address) throw new OrderError("Inserisci l'indirizzo di consegna", "address");
    const g = await geocodeAddress(input.address);
    if (!g) throw new OrderError("Non riusciamo a trovare questo indirizzo. Controlla via, civico e comune.", "address");
    geo = { lat: g.lat, lng: g.lng };
    zone = findZone(geo, zones);
    if (!zone)
      throw new OrderError(
        "Ci dispiace, questo indirizzo è fuori dalla nostra zona di consegna. Puoi scegliere l'asporto al locale.",
        "address",
      );
  }

  const fee = input.type === "delivery" ? deliveryFee(zone, subtotal) : 0;

  let discount = 0;
  let discountLabel: string | null = null;
  let discountError: string | null = null;
  if (input.discountCode) {
    const { data } = await sb.from("discount_codes").select("*").eq("code", input.discountCode.toUpperCase()).maybeSingle();
    const r = applyDiscount(data as DiscountCode | null, subtotal);
    if (r.ok) {
      discount = r.amount;
      discountLabel = r.label;
    } else discountError = r.error;
  }

  const minOrder = zone ? Number(zone.min_order) : 0;
  const missingForMinimum = Math.max(0, round2(minOrder - subtotal));
  const total = round2(Math.max(0, subtotal - discount) + fee);

  return { lines, subtotal, deliveryFee: fee, discount, discountLabel, discountError, total, pizzaCount, zone, geo, minOrder, missingForMinimum };
}

// ---------------------------------------------------------------------------
// Creazione ordine
// ---------------------------------------------------------------------------
export async function createOrder(input: OrderInput, authUserId: string | null) {
  const sb = getServiceSupabase();
  const settings = await getSettings(sb);
  if (settings.orders_paused) throw new OrderError(settings.pause_message || "Gli ordini online sono momentaneamente sospesi.");
  if (input.type === "pickup" && !settings.pickup_enabled) throw new OrderError("L'asporto non è disponibile al momento.");
  if (input.type === "delivery" && !settings.delivery_enabled) throw new OrderError("La consegna non è disponibile al momento.");

  const payAllowed: Record<PaymentMethod, boolean> = {
    cash: settings.pay_cash,
    pos: settings.pay_pos,
  };
  if (!payAllowed[input.paymentMethod]) throw new OrderError("Metodo di pagamento non disponibile", "paymentMethod");

  const quote = await computeQuote(input);
  if (quote.discountError) throw new OrderError(quote.discountError, "discountCode");
  if (quote.missingForMinimum > 0)
    throw new OrderError(
      `Ordine minimo per la tua zona: ${formatEuro(quote.minOrder)}. Mancano ${formatEuro(quote.missingForMinimum)}.`,
    );

  const plan = await getSlotPlan(input.type, quote.pizzaCount);
  if (plan.paused) throw new OrderError("Gli ordini online sono momentaneamente sospesi.");
  let scheduledFor: string;
  if (input.asap) {
    if (!plan.asap) throw new OrderError("Ora siamo chiusi: scegli un orario tra quelli disponibili.", "slot");
    scheduledFor = plan.asap.iso;
  } else {
    if (!input.slot || !isValidSlot(plan, input.slot))
      throw new OrderError("L'orario scelto non è più disponibile. Scegline un altro.", "slot");
    scheduledFor = input.slot;
  }

  // Cliente
  const customerId = await upsertCustomer(sb, input, authUserId);

  const address =
    input.type === "delivery" && input.address ? { ...input.address, lat: quote.geo?.lat, lng: quote.geo?.lng } : null;

  const { data: order, error } = await sb
    .from("orders")
    .insert({
      customer_id: customerId,
      type: input.type,
      status: "nuovo",
      asap: input.asap,
      scheduled_for: scheduledFor,
      customer_name: `${input.firstName} ${input.lastName}`.trim(),
      customer_phone: input.phone,
      customer_email: input.email || null,
      address,
      zone_id: quote.zone?.id ?? null,
      zone_name: quote.zone ? `${quote.zone.name}${quote.zone.description ? " – " + quote.zone.description : ""}` : null,
      pizza_count: quote.pizzaCount,
      subtotal: quote.subtotal,
      delivery_fee: quote.deliveryFee,
      discount: quote.discount,
      discount_code: quote.discount > 0 ? input.discountCode?.toUpperCase() : null,
      total: quote.total,
      payment_method: input.paymentMethod,
      payment_status: "unpaid",
      change_for: input.paymentMethod === "cash" ? (input.changeFor ?? null) : null,
      notes: input.notes || null,
      marketing_consent: input.marketingConsent,
    })
    .select("*")
    .single();
  if (error || !order) {
    console.error(error);
    throw new OrderError("Errore durante la creazione dell'ordine. Riprova.");
  }

  const items = quote.lines.map((l) => ({
    order_id: order.id,
    product_id: l.product.id,
    name: l.product.name,
    unit_price: l.unitPrice,
    quantity: l.quantity,
    modifiers: l.modifiers,
    notes: l.notes || null,
  }));
  const { error: itemsError } = await sb.from("order_items").insert(items);
  if (itemsError) {
    await sb.from("orders").delete().eq("id", order.id);
    throw new OrderError("Errore durante il salvataggio dei prodotti. Riprova.");
  }

  if (quote.discount > 0 && input.discountCode) {
    const { data: ok } = await sb.rpc("redeem_discount", { p_code: input.discountCode });
    if (!ok) {
      await sb.from("orders").delete().eq("id", order.id);
      throw new OrderError("Il codice sconto non è più valido", "discountCode");
    }
  }

  const full = await getOrderWithItems(order.id);
  if (full) await sendOrderConfirmation(full);

  return { id: order.id as string, number: order.number as number, total: quote.total };
}

async function upsertCustomer(
  sb: ReturnType<typeof getServiceSupabase>,
  input: OrderInput,
  authUserId: string | null,
): Promise<string | null> {
  const fields = {
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    email: input.email ? input.email.toLowerCase() : null,
    ...(input.marketingConsent ? { marketing_consent: true } : {}),
  };
  let existing: { id: string } | null = null;
  if (authUserId) {
    ({ data: existing } = await sb.from("customers").select("id").eq("auth_user_id", authUserId).maybeSingle());
    if (!existing) {
      const { data } = await sb.from("customers").insert({ ...fields, auth_user_id: authUserId }).select("id").single();
      return data?.id ?? null;
    }
  } else {
    // Ospite: lo riconosco solo se coincidono telefono ED email. Altrimenti chi conosce il telefono
    // di un cliente potrebbe cambiargli l'email e poi, accedendo, vedere i suoi ordini passati.
    const email = input.email ? input.email.toLowerCase() : null;
    let q = sb.from("customers").select("id").eq("phone", input.phone).is("auth_user_id", null);
    q = email ? q.ilike("email", escapeLike(email)) : q.is("email", null);
    ({ data: existing } = await q.order("created_at").limit(1).maybeSingle());
    if (!existing) {
      const { data } = await sb.from("customers").insert(fields).select("id").single();
      return data?.id ?? null;
    }
  }
  await sb.from("customers").update(fields).eq("id", existing.id);
  return existing.id;
}

/** Restituisce l'utilizzo del codice sconto di un ordine rifiutato/annullato */
export async function releaseDiscount(orderId: string): Promise<void> {
  const sb = getServiceSupabase();
  const { data } = await sb.from("orders").select("discount_code").eq("id", orderId).maybeSingle();
  if (data?.discount_code) await sb.rpc("release_discount", { p_code: data.discount_code });
}

/** Per i filtri ILIKE: "_" e "%" negli indirizzi email non devono fare da jolly */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => "\\" + c);
}

export async function getOrderWithItems(id: string): Promise<OrderWithItems | null> {
  const sb = getServiceSupabase();
  const { data } = await sb.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  return data ? normalizeOrder(data as OrderWithItems) : null;
}
