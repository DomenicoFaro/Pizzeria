"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { defaultModifierIds, formatEuro, priceLine, removableIngredients } from "@/lib/pricing";
import type { MenuProduct } from "@/lib/types";
import { AllergenIcons, TagBadges } from "./Badges";
import { ProductImage } from "./ProductImage";

export function ProductSheet({
  product,
  categorySlug,
  onClose,
  canOrder,
}: {
  product: MenuProduct;
  categorySlug: string;
  onClose: () => void;
  canOrder: boolean;
}) {
  const { addLine } = useCart();
  const [selected, setSelected] = useState<string[]>(() => defaultModifierIds(product));
  const [removed, setRemoved] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [qty, setQty] = useState(1);
  const closeRef = useRef<HTMLButtonElement>(null);

  const removable = useMemo(() => removableIngredients(product.description), [product.description]);
  const isPizza = categorySlug.includes("pizz");
  const result = priceLine(product, selected, removed);
  const unit = result.ok ? result.unitPrice : product.price;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const toggle = (groupId: string, modId: string, single: boolean, max: number | null) => {
    const group = product.modifier_groups.find((g) => g.id === groupId)!;
    const groupIds = new Set(group.modifiers.map((m) => m.id));
    setSelected((prev) => {
      if (single) return [...prev.filter((id) => !groupIds.has(id)), modId];
      if (prev.includes(modId)) return prev.filter((id) => id !== modId);
      const inGroup = prev.filter((id) => groupIds.has(id)).length;
      if (max != null && inGroup >= max) return prev;
      return [...prev, modId];
    });
  };

  const add = () => {
    if (!result.ok) return;
    const labels = result.modifiers.map((m) => (m.group === "Senza" ? `senza ${m.name}` : m.price_delta > 0 ? `+ ${m.name}` : m.name));
    addLine({
      productId: product.id,
      name: product.name,
      quantity: qty,
      modifierIds: selected,
      removed,
      notes: notes.trim(),
      unitPrice: result.unitPrice,
      modifierLabels: labels,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="product-title">
      <button type="button" className="animate-fade-in absolute inset-0 bg-black/55" aria-label="Chiudi" onClick={onClose} />
      <div className="animate-slide-up relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-crema shadow-2xl sm:rounded-3xl">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
          aria-label="Chiudi"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="overflow-y-auto">
          <ProductImage src={product.image_url} alt={product.name} className="aspect-[16/10] w-full" sizes="512px" />
          <div className="space-y-5 p-5">
            <div>
              <TagBadges tags={product.tags} className="mb-2" />
              <h2 id="product-title" className="font-serif text-2xl font-bold">{product.name}</h2>
              {product.description && <p className="mt-1 text-pietra">{product.description}</p>}
              <p className="mt-2 text-lg font-semibold">{formatEuro(product.price)}</p>
            </div>

            {product.allergens.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pietra">Allergeni</h3>
                <AllergenIcons allergens={product.allergens} showLabels />
              </div>
            )}

            {canOrder &&
              product.modifier_groups.map((g) => {
                const options = g.modifiers.filter((m) => m.is_available);
                if (!options.length) return null;
                const single = g.type === "single";
                return (
                  <fieldset key={g.id}>
                    <legend className="mb-2 flex w-full items-baseline justify-between text-sm font-semibold uppercase tracking-wide text-pietra">
                      {g.name}
                      <span className="text-xs font-normal normal-case">
                        {g.required ? "obbligatorio" : g.max ? `fino a ${g.max}` : "facoltativo"}
                      </span>
                    </legend>
                    <div className={single ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "grid grid-cols-1 gap-1.5 sm:grid-cols-2"}>
                      {options.map((m) => {
                        const checked = selected.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm ring-1 transition ${
                              checked ? "bg-lava text-crema ring-lava" : "bg-white ring-lava/10 hover:ring-lava/30"
                            }`}
                          >
                            <input
                              type={single ? "radio" : "checkbox"}
                              name={g.id}
                              className="sr-only"
                              checked={checked}
                              onChange={() => toggle(g.id, m.id, single, g.max)}
                            />
                            <span className="flex items-center gap-2">
                              {!single && (
                                <span className={`flex h-5 w-5 items-center justify-center rounded-md ring-1 ${checked ? "bg-oro ring-oro" : "ring-lava/30"}`}>
                                  {checked && <Check className="h-3.5 w-3.5 text-lava" />}
                                </span>
                              )}
                              {m.name}
                            </span>
                            {m.price_delta > 0 && <span className={checked ? "text-oro-light" : "text-pietra"}>+{formatEuro(m.price_delta)}</span>}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}

            {canOrder && isPizza && removable.length > 0 && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold uppercase tracking-wide text-pietra">Togli ingredienti</legend>
                <div className="flex flex-wrap gap-2">
                  {removable.map((r) => {
                    const on = removed.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setRemoved((prev) => (on ? prev.filter((x) => x !== r) : [...prev, r]))}
                        className={`min-h-11 rounded-full px-3.5 text-sm ring-1 transition ${on ? "bg-brace/10 text-brace line-through ring-brace/40" : "bg-white ring-lava/10 hover:ring-lava/30"}`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {canOrder && (
              <div>
                <label htmlFor="item-notes" className="mb-2 block text-sm font-semibold uppercase tracking-wide text-pietra">Note per la cucina</label>
                <input
                  id="item-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={200}
                  placeholder={isPizza ? "Es. ben cotta, tagliata a spicchi" : "Es. senza sale"}
                  className="h-12 w-full rounded-xl bg-white px-4 ring-1 ring-lava/15 placeholder:text-pietra/70 focus:ring-2 focus:ring-oro focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {canOrder ? (
          <div className="flex items-center gap-3 border-t border-lava/10 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center rounded-full ring-1 ring-lava/15">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-12 w-12 items-center justify-center" aria-label="Diminuisci quantità">
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-lg font-semibold tabular-nums" aria-live="polite">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} className="flex h-12 w-12 items-center justify-center" aria-label="Aumenta quantità">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={!result.ok}
              className="flex h-14 flex-1 items-center justify-between rounded-full bg-brace px-5 font-semibold text-white shadow-lg shadow-brace/25 hover:bg-brace-dark disabled:opacity-50"
            >
              <span>Aggiungi</span>
              <span className="tabular-nums">{formatEuro(unit * qty)}</span>
            </button>
          </div>
        ) : (
          <div className="border-t border-lava/10 bg-white p-4 text-center text-sm text-pietra">
            {product.is_available ? "Gli ordini online sono momentaneamente sospesi." : "Non disponibile oggi"}
          </div>
        )}
        {!result.ok && canOrder && <p className="bg-white px-4 pb-3 text-center text-sm text-brace">{result.error}</p>}
      </div>
    </div>
  );
}
