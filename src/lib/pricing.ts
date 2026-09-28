import type { DeliveryZone, DiscountCode, MenuProduct, Modifier, OrderItemModifier } from "./types";

export const round2 = (n: number) => Math.round(n * 100) / 100;

export type LineResult =
  | { ok: true; unitPrice: number; modifiers: OrderItemModifier[] }
  | { ok: false; error: string };

/** Ingredienti "togliibili": ricavati dalla descrizione del piatto */
export function removableIngredients(description: string | null): string[] {
  if (!description) return [];
  return description
    .replace(/\[.*?\]/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40);
}

/** Selezione predefinita (prima opzione di default o prima disponibile) dei gruppi obbligatori */
export function defaultModifierIds(product: MenuProduct): string[] {
  const ids: string[] = [];
  for (const g of product.modifier_groups) {
    if (g.type !== "single" || !g.required) continue;
    const avail = g.modifiers.filter((m) => m.is_available);
    const def = avail.find((m) => m.is_default) ?? avail[0];
    if (def) ids.push(def.id);
  }
  return ids;
}

/**
 * Valida le personalizzazioni scelte e calcola il prezzo unitario.
 * Usata sia dal client (anteprima) sia dal server (fonte di verità).
 */
export function priceLine(product: MenuProduct, modifierIds: string[], removed: string[] = []): LineResult {
  if (!product.is_available) return { ok: false, error: `${product.name} non è disponibile oggi` };

  const chosen = new Set(modifierIds);
  const known = new Map<string, { m: Modifier; group: string }>();
  for (const g of product.modifier_groups) for (const m of g.modifiers) known.set(m.id, { m, group: g.name });
  for (const id of chosen) if (!known.has(id)) return { ok: false, error: "Personalizzazione non valida" };

  const out: OrderItemModifier[] = [];
  let unit = Number(product.price);

  for (const g of product.modifier_groups) {
    let picked = g.modifiers.filter((m) => chosen.has(m.id));
    // gruppo obbligatorio a scelta singola senza selezione: uso l'opzione predefinita
    if (g.type === "single" && g.required && picked.length === 0) {
      const def = g.modifiers.find((m) => m.is_default && m.is_available) ?? g.modifiers.find((m) => m.is_available);
      if (def) picked = [def];
    }
    if (picked.some((m) => !m.is_available)) return { ok: false, error: `Opzione non disponibile per ${product.name}` };
    if (g.type === "single" && picked.length > 1) return { ok: false, error: `Scegli una sola opzione per "${g.name}"` };
    if (g.required && picked.length < Math.max(1, g.min)) return { ok: false, error: `Scegli "${g.name}" per ${product.name}` };
    if (g.max != null && picked.length > g.max) return { ok: false, error: `Massimo ${g.max} scelte per "${g.name}"` };
    for (const m of picked) {
      unit += Number(m.price_delta);
      // l'opzione di default gratuita non serve in comanda ("Impasto: Classico")
      if (!(m.is_default && Number(m.price_delta) === 0)) {
        out.push({ id: m.id, group: g.name, name: m.name, price_delta: Number(m.price_delta) });
      }
    }
  }

  const allowed = removableIngredients(product.description);
  for (const r of removed) {
    if (!allowed.includes(r)) return { ok: false, error: "Ingrediente da togliere non valido" };
    out.push({ group: "Senza", name: r, price_delta: 0 });
  }

  return { ok: true, unitPrice: round2(unit), modifiers: out };
}

export function deliveryFee(zone: DeliveryZone | null, subtotal: number): number {
  if (!zone) return 0;
  if (zone.free_over != null && subtotal >= Number(zone.free_over)) return 0;
  return Number(zone.fee);
}

export type DiscountResult = { ok: true; amount: number; label: string } | { ok: false; error: string };

export function applyDiscount(code: DiscountCode | null, subtotal: number, now = new Date()): DiscountResult {
  if (!code || !code.is_active) return { ok: false, error: "Codice sconto non valido" };
  if (code.expires_at && new Date(code.expires_at) <= now) return { ok: false, error: "Codice sconto scaduto" };
  if (code.max_uses != null && code.used >= code.max_uses) return { ok: false, error: "Codice sconto esaurito" };
  if (subtotal < Number(code.min_order))
    return { ok: false, error: `Codice valido per ordini da almeno ${formatEuro(Number(code.min_order))}` };
  const amount =
    code.type === "percent" ? round2((subtotal * Number(code.value)) / 100) : Math.min(subtotal, Number(code.value));
  const label = code.type === "percent" ? `-${Number(code.value)}%` : `-${formatEuro(Number(code.value))}`;
  return { ok: true, amount: round2(amount), label };
}

const euro = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
export function formatEuro(n: number): string {
  return euro.format(n);
}
