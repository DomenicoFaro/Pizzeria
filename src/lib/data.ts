import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabase } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/env";
import type {
  Category,
  Closure,
  DeliveryZone,
  MenuCategory,
  MenuProduct,
  Modifier,
  ModifierGroup,
  OpeningHour,
  Product,
  Settings,
} from "./types";
import { addDays, romeDateKey } from "./time";

export const DEFAULT_SETTINGS: Settings = {
  prep_time_pickup: 25,
  prep_time_delivery: 45,
  slot_minutes: 15,
  slot_capacity: 8,
  days_ahead: 3,
  orders_paused: false,
  pause_message: null,
  pay_online: false,
  pay_cash: true,
  pay_pos: true,
  pickup_enabled: true,
  delivery_enabled: true,
  phone: "+39 353 375 8344",
  phone_landline: "095 586 0993",
  whatsapp: "393533758344",
  email: "info@ristorodelletna.it",
  company_name: "RistOro dell'Etna",
  vat_number: null,
  announcement: null,
};

export const DEFAULT_HOURS: OpeningHour[] = [
  { weekday: 1, open_time: "19:30", close_time: "00:00" },
  { weekday: 3, open_time: "19:30", close_time: "00:00" },
  { weekday: 4, open_time: "19:30", close_time: "00:00" },
  { weekday: 5, open_time: "19:30", close_time: "00:00" },
  { weekday: 6, open_time: "19:30", close_time: "00:00" },
  { weekday: 0, open_time: "12:30", close_time: "15:00" },
  { weekday: 0, open_time: "19:30", close_time: "23:30" },
];

const num = (v: unknown) => (v == null ? v : Number(v));

function normalizeProduct(p: Product): Product {
  return { ...p, price: Number(p.price), allergens: p.allergens ?? [], tags: p.tags ?? [] };
}

/** Catalogo completo con personalizzazioni. `includeInactive` per l'admin. */
export async function getMenu(opts: { includeInactive?: boolean; client?: SupabaseClient } = {}): Promise<MenuCategory[]> {
  if (!isSupabaseConfigured) return [];
  const sb = opts.client ?? getPublicSupabase();
  const [cats, prods, groups, mods, links] = await Promise.all([
    sb.from("categories").select("*").order("position"),
    sb.from("products").select("*").order("position"),
    sb.from("modifier_groups").select("*").order("position"),
    sb.from("modifiers").select("*").order("position"),
    sb.from("product_modifier_groups").select("*"),
  ]);
  for (const r of [cats, prods, groups, mods, links]) if (r.error) throw r.error;

  const modifiersByGroup = new Map<string, Modifier[]>();
  for (const m of (mods.data ?? []) as Modifier[]) {
    const list = modifiersByGroup.get(m.group_id) ?? [];
    list.push({ ...m, price_delta: Number(m.price_delta) });
    modifiersByGroup.set(m.group_id, list);
  }
  const groupsById = new Map<string, ModifierGroup>(((groups.data ?? []) as ModifierGroup[]).map((g) => [g.id, g]));
  const groupsByProduct = new Map<string, string[]>();
  for (const l of (links.data ?? []) as { product_id: string; group_id: string }[]) {
    const list = groupsByProduct.get(l.product_id) ?? [];
    list.push(l.group_id);
    groupsByProduct.set(l.product_id, list);
  }

  const products: MenuProduct[] = ((prods.data ?? []) as Product[]).map((p) => ({
    ...normalizeProduct(p),
    modifier_groups: (groupsByProduct.get(p.id) ?? [])
      .map((gid) => groupsById.get(gid))
      .filter((g): g is ModifierGroup => Boolean(g))
      .sort((a, b) => a.position - b.position)
      .map((g) => ({ ...g, modifiers: modifiersByGroup.get(g.id) ?? [] })),
  }));

  return ((cats.data ?? []) as Category[])
    .filter((c) => opts.includeInactive || c.is_active)
    .map((c) => ({ ...c, products: products.filter((p) => p.category_id === c.id) }));
}

export async function getSettings(client?: SupabaseClient): Promise<Settings> {
  if (!isSupabaseConfigured) return DEFAULT_SETTINGS;
  const sb = client ?? getPublicSupabase();
  const { data } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
  return { ...DEFAULT_SETTINGS, ...(data ?? {}) };
}

export async function getHours(client?: SupabaseClient): Promise<OpeningHour[]> {
  if (!isSupabaseConfigured) return DEFAULT_HOURS;
  const sb = client ?? getPublicSupabase();
  const { data } = await sb.from("opening_hours").select("*").order("weekday").order("open_time");
  return (data as OpeningHour[] | null) ?? DEFAULT_HOURS;
}

export async function getClosures(client?: SupabaseClient): Promise<Closure[]> {
  if (!isSupabaseConfigured) return [];
  const sb = client ?? getPublicSupabase();
  const since = addDays(romeDateKey(new Date()), -1);
  const { data } = await sb.from("closures").select("*").gte("date_to", since).order("date_from");
  return (data as Closure[] | null) ?? [];
}

export async function getZones(client?: SupabaseClient): Promise<DeliveryZone[]> {
  if (!isSupabaseConfigured) return [];
  const sb = client ?? getPublicSupabase();
  const { data } = await sb.from("delivery_zones").select("*").order("position");
  return ((data ?? []) as DeliveryZone[]).map((z) => ({
    ...z,
    fee: Number(z.fee),
    min_order: Number(z.min_order),
    free_over: num(z.free_over) as number | null,
    radius_km: num(z.radius_km) as number | null,
  }));
}

/** Dati pubblici usati da header, footer, badge orari */
export async function getPublicInfo() {
  const [settings, hours, closures] = await Promise.all([getSettings(), getHours(), getClosures()]);
  return { settings, hours, closures };
}
