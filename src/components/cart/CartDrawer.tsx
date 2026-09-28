"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { formatEuro } from "@/lib/pricing";
import { useCart } from "./CartProvider";
import { ModeToggle } from "./ModeToggle";

export function CartDrawer() {
  const { lines, drawerOpen, setDrawerOpen, updateQuantity, removeLine, subtotal, count } = useCart();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, setDrawerOpen]);

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <button type="button" className="animate-fade-in absolute inset-0 bg-black/50" aria-label="Chiudi carrello" onClick={() => setDrawerOpen(false)} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-crema shadow-2xl motion-safe:animate-[slide-up_.25s_ease-out]">
        <div className="flex items-center justify-between border-b border-lava/10 px-5 py-4">
          <h2 id="cart-title" className="font-serif text-2xl font-bold">Il tuo ordine</h2>
          <button ref={closeRef} type="button" onClick={() => setDrawerOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Chiudi">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="border-b border-lava/10 px-5 py-3">
          <ModeToggle />
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-pietra/50" aria-hidden="true" />
            <p className="text-pietra">Il carrello è vuoto.<br />Scegli qualcosa di buono dal menù!</p>
            <Link href="/ordina" onClick={() => setDrawerOpen(false)} className="inline-flex h-12 items-center rounded-full bg-brace px-6 font-semibold text-white hover:bg-brace-dark">
              Vai al menù
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-lava/10 overflow-y-auto px-5">
              {lines.map((l) => (
                <li key={l.key} className="py-4">
                  <div className="flex justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{l.name}</p>
                      {l.modifierLabels.length > 0 && <p className="mt-0.5 text-sm text-pietra">{l.modifierLabels.join(" · ")}</p>}
                      {l.notes && <p className="mt-0.5 text-sm italic text-pietra">“{l.notes}”</p>}
                    </div>
                    <p className="shrink-0 font-semibold tabular-nums">{formatEuro(l.unitPrice * l.quantity)}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-full bg-white ring-1 ring-lava/10">
                      <button type="button" onClick={() => updateQuantity(l.key, l.quantity - 1)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lava/5" aria-label={`Diminuisci ${l.name}`}>
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{l.quantity}</span>
                      <button type="button" onClick={() => updateQuantity(l.key, l.quantity + 1)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lava/5" aria-label={`Aumenta ${l.name}`}>
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <button type="button" onClick={() => removeLine(l.key)} className="flex h-11 items-center gap-1.5 rounded-full px-3 text-sm text-pietra hover:bg-lava/5 hover:text-brace">
                      <Trash2 className="h-4 w-4" aria-hidden="true" /> Rimuovi
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-lava/10 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Subtotale ({count})</span>
                <span className="tabular-nums">{formatEuro(subtotal)}</span>
              </div>
              <p className="mt-1 text-sm text-pietra">Costi di consegna e sconti calcolati al checkout.</p>
              <Link
                href="/checkout"
                onClick={() => setDrawerOpen(false)}
                className="mt-4 flex h-14 items-center justify-center rounded-full bg-brace text-lg font-semibold text-white shadow-lg shadow-brace/30 hover:bg-brace-dark"
              >
                Vai al checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
