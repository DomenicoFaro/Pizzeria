"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaffAction } from "@/lib/auth";
import { sendStatusUpdate } from "@/lib/email";
import { getOrderWithItems, releaseDiscount } from "@/lib/orders";
import { NEXT_STATUS } from "@/lib/order-status";
import { getServiceSupabase } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";

type Result = { ok: true } | { ok: false, error: string };

async function run(fn: () => Promise<void>): Promise<Result> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    console.error(e);
    return { ok: false, error: e instanceof Error ? e.message : "Errore" };
  }
}

function check<T = unknown>(res: { error: { message: string } | null; data?: unknown }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

/** Il sito pubblico è in cache (ISR): dopo ogni modifica lo rigenero */
function refreshPublic() {
  revalidatePath("/", "layout");
}

// ===========================================================================
// ORDINI
// ===========================================================================
export async function acceptOrder(id: string, readyAtIso: string): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction();
    const readyAt = new Date(readyAtIso);
    if (Number.isNaN(readyAt.getTime())) throw new Error("Orario non valido");
    check(await sb.from("orders").update({ status: "accettato", estimated_ready_at: readyAt.toISOString() }).eq("id", id).eq("status", "nuovo"));
    const order = await getOrderWithItems(id);
    if (order) await sendStatusUpdate(order);
  });
}

const ALLOWED: OrderStatus[] = ["in_preparazione", "pronto", "in_consegna", "completato"];

export async function setOrderStatus(id: string, status: OrderStatus): Promise<Result> {
  return run(async () => {
    if (!ALLOWED.includes(status)) throw new Error("Stato non valido");
    const { sb } = await requireStaffAction();
    const current = await getOrderWithItems(id);
    if (!current) throw new Error("Ordine non trovato");
    // solo il passaggio successivo previsto (es. niente "completato" su un ordine rifiutato)
    if (NEXT_STATUS[current.status]?.(current.type) !== status) throw new Error("Passaggio di stato non consentito");
    const rows = check<unknown[]>(await sb.from("orders").update({ status }).eq("id", id).eq("status", current.status).select("id"));
    if (!rows?.length) throw new Error("L'ordine è stato modificato nel frattempo: aggiorna la pagina");
    const order = await getOrderWithItems(id);
    if (order && (status === "pronto" || status === "in_consegna")) await sendStatusUpdate(order);
  });
}

export async function updateEta(id: string, readyAtIso: string): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction();
    check(await sb.from("orders").update({ estimated_ready_at: new Date(readyAtIso).toISOString() }).eq("id", id));
  });
}

export async function rejectOrder(id: string, status: "rifiutato" | "annullato", reason: string): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction();
    const rows = check<unknown[]>(
      await sb
        .from("orders")
        .update({ status, status_reason: reason.slice(0, 300) || null })
        .eq("id", id)
        .in("status", ["nuovo", "accettato", "in_preparazione", "pronto", "in_consegna"])
        .select("id"),
    );
    if (!rows?.length) throw new Error("Questo ordine è già chiuso");
    await releaseDiscount(id);
    const order = await getOrderWithItems(id);
    if (order) await sendStatusUpdate(order);
  });
}

export async function markPaid(id: string): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction();
    check(await sb.from("orders").update({ payment_status: "paid" }).eq("id", id));
  });
}

export async function setOrdersPaused(paused: boolean): Promise<Result> {
  return run(async () => {
    await requireStaffAction();
    // lo staff non ha permessi di scrittura sulle impostazioni: il controllo è fatto qui sopra
    check(await getServiceSupabase().from("settings").update({ orders_paused: paused, updated_at: new Date().toISOString() }).eq("id", 1));
    refreshPublic();
  });
}

export async function setProductAvailable(id: string, available: boolean): Promise<Result> {
  return run(async () => {
    await requireStaffAction();
    check(await getServiceSupabase().from("products").update({ is_available: available }).eq("id", id));
    refreshPublic();
  });
}

// ===========================================================================
// MENÙ (solo admin)
// ===========================================================================
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).nullable().optional(),
  is_active: z.boolean(),
  counts_for_capacity: z.boolean(),
});

export async function saveCategory(input: z.infer<typeof categorySchema>): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    const d = categorySchema.parse(input);
    if (d.id) {
      check(await sb.from("categories").update({ name: d.name, description: d.description || null, is_active: d.is_active, counts_for_capacity: d.counts_for_capacity }).eq("id", d.id));
    } else {
      const { data: last } = await sb.from("categories").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
      check(
        await sb.from("categories").insert({
          name: d.name,
          slug: `${slugify(d.name)}-${Math.random().toString(36).slice(2, 6)}`,
          description: d.description || null,
          is_active: d.is_active,
          counts_for_capacity: d.counts_for_capacity,
          position: (last?.position ?? 0) + 1,
        }),
      );
    }
    refreshPublic();
  });
}

export async function deleteCategory(id: string): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    const { count } = await sb.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
    if (count) throw new Error("Sposta o elimina prima i piatti di questa categoria");
    check(await sb.from("categories").delete().eq("id", id));
    refreshPublic();
  });
}

export async function reorder(table: "categories" | "products", ids: string[]): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    await Promise.all(ids.map((id, i) => sb.from(table).update({ position: i + 1 }).eq("id", id)));
    refreshPublic();
  });
}

const productSchema = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(400).nullable().optional(),
  price: z.number().min(0).max(999),
  allergens: z.array(z.string()).max(14),
  tags: z.array(z.string()).max(10),
  is_available: z.boolean(),
  is_featured: z.boolean(),
  image_url: z.string().url().nullable().optional(),
  modifier_group_ids: z.array(z.string().uuid()),
});

export async function saveProduct(input: z.infer<typeof productSchema>): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    const d = productSchema.parse(input);
    const row = {
      category_id: d.category_id,
      name: d.name,
      description: d.description || null,
      price: d.price,
      allergens: d.allergens,
      tags: d.tags,
      is_available: d.is_available,
      is_featured: d.is_featured,
      image_url: d.image_url || null,
    };
    let id = d.id;
    if (id) {
      check(await sb.from("products").update(row).eq("id", id));
    } else {
      const { data: last } = await sb.from("products").select("position").eq("category_id", d.category_id).order("position", { ascending: false }).limit(1).maybeSingle();
      const inserted = check<{ id: string }>(await sb.from("products").insert({ ...row, position: (last?.position ?? 0) + 1 }).select("id").single());
      id = inserted.id;
    }
    check(await sb.from("product_modifier_groups").delete().eq("product_id", id));
    if (d.modifier_group_ids.length) {
      check(await sb.from("product_modifier_groups").insert(d.modifier_group_ids.map((g) => ({ product_id: id, group_id: g }))));
    }
    refreshPublic();
  });
}

export async function deleteProduct(id: string): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    check(await sb.from("products").delete().eq("id", id));
    refreshPublic();
  });
}

const groupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  type: z.enum(["single", "multiple"]),
  required: z.boolean(),
  max: z.number().int().min(1).max(30).nullable(),
  modifiers: z.array(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(60),
      price_delta: z.number().min(0).max(99),
      is_default: z.boolean(),
      is_available: z.boolean(),
    }),
  ),
});

export async function saveModifierGroup(input: z.infer<typeof groupSchema>): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    const d = groupSchema.parse(input);
    const row = { name: d.name, type: d.type, required: d.required, min: d.required ? 1 : 0, max: d.type === "single" ? 1 : d.max };
    let id = d.id;
    if (id) check(await sb.from("modifier_groups").update(row).eq("id", id));
    else id = check<{ id: string }>(await sb.from("modifier_groups").insert(row).select("id").single()).id;

    const { data: existing } = await sb.from("modifiers").select("id").eq("group_id", id);
    const keep = new Set(d.modifiers.filter((m) => m.id).map((m) => m.id));
    const toDelete = (existing ?? []).map((m) => m.id as string).filter((mid) => !keep.has(mid));
    if (toDelete.length) check(await sb.from("modifiers").delete().in("id", toDelete));
    for (const [i, m] of d.modifiers.entries()) {
      const mrow = { group_id: id, name: m.name, price_delta: m.price_delta, is_default: m.is_default, is_available: m.is_available, position: i + 1 };
      if (m.id) check(await sb.from("modifiers").update(mrow).eq("id", m.id));
      else check(await sb.from("modifiers").insert(mrow));
    }
    refreshPublic();
  });
}

export async function deleteModifierGroup(id: string): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    check(await sb.from("modifier_groups").delete().eq("id", id));
    refreshPublic();
  });
}

// ===========================================================================
// IMPOSTAZIONI (solo admin)
// ===========================================================================
const settingsSchema = z.object({
  prep_time_pickup: z.number().int().min(5).max(180),
  prep_time_delivery: z.number().int().min(5).max(240),
  slot_minutes: z.number().int().min(5).max(60),
  slot_capacity: z.number().int().min(1).max(200),
  days_ahead: z.number().int().min(0).max(14),
  pause_message: z.string().max(300).nullable(),
  pay_cash: z.boolean(),
  pay_pos: z.boolean(),
  pickup_enabled: z.boolean(),
  delivery_enabled: z.boolean(),
  phone: z.string().max(40).nullable(),
  phone_landline: z.string().max(40).nullable(),
  whatsapp: z.string().max(20).nullable(),
  email: z.string().max(120).nullable(),
  announcement: z.string().max(200).nullable(),
});

export async function saveSettings(input: z.infer<typeof settingsSchema>): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    const d = settingsSchema.parse(input);
    check(await sb.from("settings").update({ ...d, announcement: d.announcement || null, updated_at: new Date().toISOString() }).eq("id", 1));
    refreshPublic();
  });
}

const hoursSchema = z.array(
  z.object({ weekday: z.number().int().min(0).max(6), open_time: z.string().regex(/^\d{2}:\d{2}/), close_time: z.string().regex(/^\d{2}:\d{2}/) }),
);

export async function saveHours(input: z.infer<typeof hoursSchema>): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    const d = hoursSchema.parse(input);
    check(await sb.from("opening_hours").delete().gte("weekday", 0));
    if (d.length) check(await sb.from("opening_hours").insert(d));
    refreshPublic();
  });
}

export async function addClosure(input: { date_from: string; date_to: string; reason: string }): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    if (!input.date_from || !input.date_to || input.date_to < input.date_from) throw new Error("Date non valide");
    check(await sb.from("closures").insert({ date_from: input.date_from, date_to: input.date_to, reason: input.reason || null }));
    refreshPublic();
  });
}

export async function deleteClosure(id: string): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    check(await sb.from("closures").delete().eq("id", id));
    refreshPublic();
  });
}

const zoneSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(200).nullable(),
  radius_km: z.number().min(0.1).max(100).nullable(),
  polygon: z.array(z.tuple([z.number(), z.number()])).min(3).nullable(),
  fee: z.number().min(0).max(99),
  min_order: z.number().min(0).max(999),
  free_over: z.number().min(0).max(999).nullable(),
  is_active: z.boolean(),
  position: z.number().int(),
});

export async function saveZone(input: z.infer<typeof zoneSchema>): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    const d = zoneSchema.parse(input);
    if (d.radius_km == null && d.polygon == null) throw new Error("Indica un raggio in km o un poligono");
    const { id, ...row } = d;
    if (id) check(await sb.from("delivery_zones").update(row).eq("id", id));
    else check(await sb.from("delivery_zones").insert(row));
    refreshPublic();
  });
}

export async function deleteZone(id: string): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    check(await sb.from("delivery_zones").delete().eq("id", id));
    refreshPublic();
  });
}

// ===========================================================================
// PRENOTAZIONI ED EVENTI
// ===========================================================================
export async function setBookingStatus(table: "reservations" | "event_requests", id: string, status: "in_attesa" | "confermata" | "rifiutata"): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction();
    check(await sb.from(table).update({ status }).eq("id", id));
    revalidatePath("/admin/prenotazioni");
  });
}

// ===========================================================================
// PROMOZIONI (solo admin)
// ===========================================================================
const discountSchema = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[A-Z0-9_-]+$/i, "Solo lettere, numeri, - e _"),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive().max(1000),
  min_order: z.number().min(0).max(1000),
  expires_at: z.string().nullable(),
  max_uses: z.number().int().positive().nullable(),
  is_active: z.boolean(),
});

export async function saveDiscount(input: z.infer<typeof discountSchema>): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    const d = discountSchema.parse(input);
    if (d.type === "percent" && d.value > 100) throw new Error("La percentuale non può superare 100");
    check(
      await sb.from("discount_codes").upsert({
        ...d,
        code: d.code.toUpperCase(),
        expires_at: d.expires_at ? new Date(d.expires_at).toISOString() : null,
      }),
    );
    revalidatePath("/admin/promozioni");
  });
}

export async function deleteDiscount(code: string): Promise<Result> {
  return run(async () => {
    const { sb } = await requireStaffAction(true);
    check(await sb.from("discount_codes").delete().eq("code", code));
    revalidatePath("/admin/promozioni");
  });
}
