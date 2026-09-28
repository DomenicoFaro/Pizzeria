"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { ModeToggle } from "@/components/cart/ModeToggle";
import { useSiteInfo } from "@/components/site/SiteInfo";
import { OpenBadge } from "@/components/site/OpenBadge";
import { defaultModifierIds, formatEuro, priceLine } from "@/lib/pricing";
import type { MenuCategory, MenuProduct } from "@/lib/types";
import { AllergenIcons, TagBadges } from "./Badges";
import { ProductImage } from "./ProductImage";
import { ProductSheet } from "./ProductSheet";

const FILTERS = [
  { code: "vegetariano", label: "Vegetariano", test: (p: MenuProduct) => p.tags.includes("vegetariano") || p.tags.includes("vegano") },
  { code: "vegano", label: "Vegano", test: (p: MenuProduct) => p.tags.includes("vegano") },
  { code: "no-lattosio", label: "Senza lattosio", test: (p: MenuProduct) => !p.allergens.includes("latte") },
  { code: "no-frutta", label: "Senza frutta a guscio", test: (p: MenuProduct) => !p.allergens.includes("frutta_guscio") },
  { code: "piccante", label: "Piccante", test: (p: MenuProduct) => p.tags.includes("piccante") },
];

export function MenuBrowser({ categories, ordering = false }: { categories: MenuCategory[]; ordering?: boolean }) {
  const { settings } = useSiteInfo();
  const { addLine } = useCart();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  const [activeCat, setActiveCat] = useState(categories[0]?.slug ?? "");
  const [open, setOpen] = useState<{ product: MenuProduct; slug: string } | null>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const canOrder = !settings.orders_paused;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = FILTERS.filter((f) => filters.includes(f.code));
    return categories
      .map((c) => ({
        ...c,
        products: c.products.filter(
          (p) =>
            (!q || p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)) &&
            active.every((f) => f.test(p)),
        ),
      }))
      .filter((c) => c.products.length > 0);
  }, [categories, query, filters]);

  // scroll-spy sulle categorie
  useEffect(() => {
    const sections = visible.map((c) => document.getElementById(`cat-${c.slug}`)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveCat(top.target.id.replace("cat-", ""));
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [visible]);

  // tiene visibile la chip attiva
  useEffect(() => {
    const chip = chipsRef.current?.querySelector<HTMLElement>(`[data-cat="${activeCat}"]`);
    chip?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeCat]);

  const quickAdd = useCallback(
    (p: MenuProduct) => {
      const mods = defaultModifierIds(p);
      const r = priceLine(p, mods);
      if (!r.ok) return;
      addLine({ productId: p.id, name: p.name, quantity: 1, modifierIds: mods, removed: [], notes: "", unitPrice: r.unitPrice, modifierLabels: [] });
    },
    [addLine],
  );

  const closeSheet = useCallback(() => setOpen(null), []);

  return (
    <div>
      {ordering && (
        <div className="mx-auto max-w-3xl px-4 pb-2 pt-6 sm:px-6">
          {settings.orders_paused ? (
            <div className="rounded-2xl bg-brace/10 p-4 text-center text-brace ring-1 ring-brace/20">
              {settings.pause_message || "Gli ordini online sono momentaneamente sospesi."}
            </div>
          ) : (
            <ModeToggle size="lg" />
          )}
        </div>
      )}

      {/* barra sticky: ricerca + categorie */}
      <div className="sticky top-[var(--header-h)] z-20 border-b border-lava/10 bg-crema/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">Cerca nel menù</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pietra" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cerca un piatto o un ingrediente…"
                className="h-11 w-full rounded-full bg-white pl-10 pr-10 text-[16px] ring-1 ring-lava/10 placeholder:text-pietra/70 focus:outline-none focus:ring-2 focus:ring-oro"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Cancella ricerca">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          </div>
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Filtri">
            {FILTERS.map((f) => {
              const on = filters.includes(f.code);
              return (
                <button
                  key={f.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilters((prev) => (on ? prev.filter((x) => x !== f.code) : [...prev, f.code]))}
                  className={`h-8 shrink-0 rounded-full px-3 text-xs font-medium ring-1 transition ${on ? "bg-basilico text-white ring-basilico" : "bg-white text-lava ring-lava/10"}`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <nav ref={chipsRef} className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 py-2" aria-label="Categorie del menù">
            {visible.map((c) => (
              <a
                key={c.slug}
                href={`#cat-${c.slug}`}
                data-cat={c.slug}
                aria-current={activeCat === c.slug ? "true" : undefined}
                className={`flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition ${
                  activeCat === c.slug ? "bg-lava text-crema" : "text-lava hover:bg-lava/5"
                }`}
              >
                {c.name}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {visible.length === 0 && (
          <p className="py-16 text-center text-pietra">
            Nessun piatto trovato.{" "}
            <button type="button" className="font-semibold text-brace underline" onClick={() => { setQuery(""); setFilters([]); }}>
              Azzera i filtri
            </button>
          </p>
        )}
        {visible.map((c) => (
          <section key={c.id} id={`cat-${c.slug}`} className="scroll-mt-[calc(var(--header-h)+9.5rem)] pt-10" aria-labelledby={`h-${c.slug}`}>
            <h2 id={`h-${c.slug}`} className="font-serif text-3xl font-bold">{c.name}</h2>
            {c.description && <p className="mt-1 text-pietra">{c.description}</p>}
            <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {c.products.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} canOrder={canOrder} onOpen={() => setOpen({ product: p, slug: c.slug })} onQuickAdd={() => quickAdd(p)} />
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-12 rounded-2xl bg-white p-4 text-sm text-pietra ring-1 ring-lava/10">
          Allergeni secondo il Reg. UE 1169/2011. Per intolleranze o allergie chiedi sempre al personale.{" "}
          <Link href="/allergeni" className="font-semibold text-brace-dark underline underline-offset-2">Informativa allergeni</Link>
          <span className="mt-2 block"><OpenBadge variant="light" /></span>
        </p>
      </div>

      {open && <ProductSheet product={open.product} categorySlug={open.slug} onClose={closeSheet} canOrder={canOrder && open.product.is_available} />}
    </div>
  );
}

function ProductCard({
  product: p,
  canOrder,
  onOpen,
  onQuickAdd,
}: {
  product: MenuProduct;
  canOrder: boolean;
  onOpen: () => void;
  onQuickAdd: () => void;
}) {
  const unavailable = !p.is_available;
  return (
    <article
      className={`group relative flex h-full gap-3 rounded-2xl bg-white p-3 ring-1 ring-lava/5 transition hover:shadow-lg hover:shadow-lava/5 ${
        unavailable ? "opacity-55 grayscale" : ""
      }`}
    >
      <button type="button" onClick={onOpen} className="absolute inset-0 z-0 rounded-2xl" aria-label={`Dettagli ${p.name}`} />
      <div className="relative min-w-0 flex-1">
        <TagBadges tags={p.tags} className="mb-1" />
        <h3 className="font-serif text-lg font-bold leading-snug">{p.name}</h3>
        {p.description && <p className="mt-0.5 line-clamp-2 text-sm text-pietra">{p.description}</p>}
        <div className="mt-2 flex items-center gap-3">
          <span className="font-semibold tabular-nums">{formatEuro(p.price)}</span>
          <AllergenIcons allergens={p.allergens} />
        </div>
        {unavailable && <p className="mt-1 text-sm font-semibold text-brace">Non disponibile oggi</p>}
      </div>
      <div className={`relative shrink-0 ${p.image_url ? "" : "flex items-end"}`}>
        <ProductImage src={p.image_url} alt={p.name} className="h-24 w-24 rounded-xl sm:h-28 sm:w-28" />
        {canOrder && !unavailable && (
          <button
            type="button"
            onClick={onQuickAdd}
            className={`${p.image_url ? "absolute -bottom-2 -right-2" : "relative"} z-10 flex h-11 w-11 items-center justify-center rounded-full bg-brace text-white shadow-lg shadow-brace/30 transition hover:scale-105 hover:bg-brace-dark active:scale-95`}
            aria-label={`Aggiungi ${p.name} al carrello`}
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>
    </article>
  );
}
