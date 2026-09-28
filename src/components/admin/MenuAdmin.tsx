"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import {
  deleteCategory,
  deleteModifierGroup,
  deleteProduct,
  reorder,
  saveCategory,
  saveModifierGroup,
  saveProduct,
  setProductAvailable,
} from "@/app/admin/actions";
import { ProductImage } from "@/components/menu/ProductImage";
import { ALLERGENS, TAGS } from "@/lib/allergens";
import { formatEuro } from "@/lib/pricing";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { MenuCategory, MenuProduct, ModifierGroupWithOptions } from "@/lib/types";
import { adminInput, Card, Modal, moveItem, PrimaryButton, SecondaryButton, Toggle } from "./ui";

type Result = { ok: boolean; error?: string };

export function MenuAdmin({ categories: initial, groups, isAdmin }: { categories: MenuCategory[]; groups: ModifierGroupWithOptions[]; isAdmin: boolean }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial);
  const [editingProduct, setEditingProduct] = useState<{ product: Partial<MenuProduct>; } | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<MenuCategory> | null>(null);
  const [editingGroup, setEditingGroup] = useState<Partial<ModifierGroupWithOptions> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [drag, setDrag] = useState<{ kind: "cat" | "prod"; catId?: string; index: number } | null>(null);

  // sincronizza con i dati del server dopo router.refresh()
  const [prevInitial, setPrevInitial] = useState(initial);
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setCategories(initial);
  }

  const exec = (fn: () => Promise<Result>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Errore");
      else {
        after?.();
        router.refresh();
      }
    });
  };

  const toggleAvailable = (p: MenuProduct) => {
    setCategories((cs) => cs.map((c) => ({ ...c, products: c.products.map((x) => (x.id === p.id ? { ...x, is_available: !p.is_available } : x)) })));
    exec(() => setProductAvailable(p.id, !p.is_available));
  };

  const moveCategory = (from: number, to: number) => {
    if (to < 0 || to >= categories.length) return;
    const next = moveItem(categories, from, to);
    setCategories(next);
    exec(() => reorder("categories", next.map((c) => c.id)));
  };

  const moveProduct = (catId: string, from: number, to: number) => {
    const cat = categories.find((c) => c.id === catId)!;
    if (to < 0 || to >= cat.products.length) return;
    const products = moveItem(cat.products, from, to);
    setCategories((cs) => cs.map((c) => (c.id === catId ? { ...c, products } : c)));
    exec(() => reorder("products", products.map((p) => p.id)));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-serif text-3xl font-bold">Menù</h1>
        {isAdmin && (
          <>
            <SecondaryButton onClick={() => setEditingCategory({ is_active: true, counts_for_capacity: false })}>
              <Plus className="h-4 w-4" /> Categoria
            </SecondaryButton>
            <PrimaryButton onClick={() => setEditingProduct({ product: { category_id: categories[0]?.id, is_available: true, allergens: [], tags: [], price: 0, modifier_groups: [] } })}>
              <Plus className="h-4 w-4" /> Piatto
            </PrimaryButton>
          </>
        )}
      </div>
      {!isAdmin && <p className="rounded-2xl bg-oro/15 p-3 text-sm">Come staff puoi segnare i piatti “non disponibili oggi”. Le altre modifiche sono riservate al titolare.</p>}
      {error && <p className="rounded-2xl bg-brace/10 p-3 text-sm text-brace" role="alert">{error}</p>}

      {categories.map((c, ci) => (
        <div
          key={c.id}
          draggable={isAdmin}
          onDragStart={(e) => {
            if ((e.target as HTMLElement).dataset.kind !== "cat") return;
            setDrag({ kind: "cat", index: ci });
          }}
          onDragOver={(e) => drag?.kind === "cat" && e.preventDefault()}
          onDrop={() => {
            if (drag?.kind === "cat" && drag.index !== ci) moveCategory(drag.index, ci);
            setDrag(null);
          }}
          data-kind="cat"
        >
          <Card
            title={`${c.name}${c.is_active ? "" : " (nascosta)"}`}
            actions={
              isAdmin && (
                <div className="flex items-center gap-1">
                  <span className="cursor-grab p-2 text-pietra" title="Trascina per riordinare"><GripVertical className="h-5 w-5" /></span>
                  <button type="button" onClick={() => moveCategory(ci, ci - 1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Sposta su"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => moveCategory(ci, ci + 1)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Sposta giù"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => setEditingCategory(c)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Modifica categoria"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => confirm(`Eliminare la categoria "${c.name}"?`) && exec(() => deleteCategory(c.id))} className="flex h-10 w-10 items-center justify-center rounded-full text-brace hover:bg-brace/5" aria-label="Elimina categoria"><Trash2 className="h-4 w-4" /></button>
                </div>
              )
            }
          >
            <ul className="divide-y divide-lava/5">
              {c.products.map((p, pi) => (
                <li
                  key={p.id}
                  draggable={isAdmin}
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDrag({ kind: "prod", catId: c.id, index: pi });
                  }}
                  onDragOver={(e) => {
                    if (drag?.kind === "prod" && drag.catId === c.id) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onDrop={(e) => {
                    e.stopPropagation();
                    if (drag?.kind === "prod" && drag.catId === c.id && drag.index !== pi) moveProduct(c.id, drag.index, pi);
                    setDrag(null);
                  }}
                  className={`flex items-center gap-3 py-2 ${p.is_available ? "" : "opacity-60"}`}
                >
                  {isAdmin && <GripVertical className="h-5 w-5 shrink-0 cursor-grab text-pietra/60" aria-hidden="true" />}
                  <ProductImage src={p.image_url} alt="" emptyBox className="h-12 w-12 shrink-0 rounded-lg" sizes="48px" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}{p.is_featured && <span className="ml-2 text-xs text-oro-dark">★ in evidenza</span>}</p>
                    <p className="truncate text-sm text-pietra">{formatEuro(p.price)} · {p.allergens.length} allergeni{p.modifier_groups.length ? ` · ${p.modifier_groups.map((g) => g.name).join(", ")}` : ""}</p>
                  </div>
                  <Toggle checked={p.is_available} onChange={() => toggleAvailable(p)} label={p.is_available ? "Disponibile" : "Esaurito"} />
                  {isAdmin && (
                    <div className="hidden shrink-0 sm:flex">
                      <button type="button" onClick={() => moveProduct(c.id, pi, pi - 1)} className="flex h-10 w-9 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Sposta su"><ArrowUp className="h-4 w-4" /></button>
                      <button type="button" onClick={() => moveProduct(c.id, pi, pi + 1)} className="flex h-10 w-9 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Sposta giù"><ArrowDown className="h-4 w-4" /></button>
                    </div>
                  )}
                  {isAdmin && (
                    <button type="button" onClick={() => setEditingProduct({ product: p })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-lava/5" aria-label={`Modifica ${p.name}`}>
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
              {c.products.length === 0 && <li className="py-4 text-sm text-pietra">Nessun piatto</li>}
            </ul>
          </Card>
        </div>
      ))}

      {isAdmin && (
        <Card title="Personalizzazioni" actions={<SecondaryButton onClick={() => setEditingGroup({ type: "multiple", required: false, max: null, modifiers: [] })}><Plus className="h-4 w-4" /> Gruppo</SecondaryButton>}>
          <ul className="divide-y divide-lava/5">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-semibold">{g.name} <span className="text-xs font-normal text-pietra">({g.type === "single" ? "scelta singola" : "scelta multipla"}{g.required ? ", obbligatorio" : ""})</span></p>
                  <p className="text-sm text-pietra">{g.modifiers.map((m) => `${m.name}${m.price_delta ? ` +${formatEuro(m.price_delta)}` : ""}${m.is_available ? "" : " (off)"}`).join(" · ")}</p>
                </div>
                <div className="flex shrink-0">
                  <button type="button" onClick={() => setEditingGroup(g)} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Modifica gruppo"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => confirm(`Eliminare il gruppo "${g.name}"?`) && exec(() => deleteModifierGroup(g.id))} className="flex h-10 w-10 items-center justify-center rounded-full text-brace hover:bg-brace/5" aria-label="Elimina gruppo"><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {editingProduct && (
        <ProductEditor
          product={editingProduct.product}
          categories={categories}
          groups={groups}
          onClose={() => setEditingProduct(null)}
          onSave={(data) => exec(() => saveProduct(data), () => setEditingProduct(null))}
          onDelete={(id) => confirm("Eliminare definitivamente il piatto?") && exec(() => deleteProduct(id), () => setEditingProduct(null))}
        />
      )}
      {editingCategory && <CategoryEditor category={editingCategory} onClose={() => setEditingCategory(null)} onSave={(d) => exec(() => saveCategory(d), () => setEditingCategory(null))} />}
      {editingGroup && <GroupEditor group={editingGroup} onClose={() => setEditingGroup(null)} onSave={(d) => exec(() => saveModifierGroup(d), () => setEditingGroup(null))} />}
    </div>
  );
}

function CategoryEditor({ category, onClose, onSave }: { category: Partial<MenuCategory>; onClose: () => void; onSave: (d: Parameters<typeof saveCategory>[0]) => void }) {
  const [name, setName] = useState(category.name ?? "");
  const [description, setDescription] = useState(category.description ?? "");
  const [active, setActive] = useState(category.is_active ?? true);
  const [capacity, setCapacity] = useState(category.counts_for_capacity ?? false);
  return (
    <Modal
      title={category.id ? "Modifica categoria" : "Nuova categoria"}
      onClose={onClose}
      footer={<PrimaryButton className="w-full" disabled={!name.trim()} onClick={() => onSave({ id: category.id, name, description, is_active: active, counts_for_capacity: capacity })}>Salva</PrimaryButton>}
    >
      <div className="space-y-3">
        <label className="block text-sm font-medium">Nome<input className={`${adminInput} mt-1`} value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="block text-sm font-medium">Descrizione<input className={`${adminInput} mt-1`} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <Toggle checked={active} onChange={setActive} label="Visibile nel menù" />
        <Toggle checked={capacity} onChange={setCapacity} label="Conta per la capacità del forno (pizze)" />
      </div>
    </Modal>
  );
}

function ProductEditor({
  product,
  categories,
  groups,
  onClose,
  onSave,
  onDelete,
}: {
  product: Partial<MenuProduct>;
  categories: MenuCategory[];
  groups: ModifierGroupWithOptions[];
  onClose: () => void;
  onSave: (d: Parameters<typeof saveProduct>[0]) => void;
  onDelete: (id: string) => void;
}) {
  const [f, setF] = useState({
    name: product.name ?? "",
    description: product.description ?? "",
    price: String(product.price ?? ""),
    category_id: product.category_id ?? categories[0]?.id ?? "",
    allergens: product.allergens ?? [],
    tags: product.tags ?? [],
    is_available: product.is_available ?? true,
    is_featured: product.is_featured ?? false,
    image_url: product.image_url ?? null,
    modifier_group_ids: (product.modifier_groups ?? []).map((g) => g.id),
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const toggleIn = (key: "allergens" | "tags" | "modifier_group_ids", v: string) =>
    setF((s) => ({ ...s, [key]: s[key].includes(v) ? s[key].filter((x) => x !== v) : [...s[key], v] }));

  const upload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `products/${crypto.randomUUID()}.${ext}`;
    const sb = getBrowserSupabase();
    const { error } = await sb.storage.from("menu").upload(path, file, { cacheControl: "31536000", contentType: file.type });
    setUploading(false);
    if (error) return setUploadError(error.message);
    setF((s) => ({ ...s, image_url: sb.storage.from("menu").getPublicUrl(path).data.publicUrl }));
  };

  const price = Number(f.price.replace(",", "."));
  const valid = f.name.trim() && f.category_id && !Number.isNaN(price) && price >= 0;

  return (
    <Modal
      title={product.id ? "Modifica piatto" : "Nuovo piatto"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {product.id && <SecondaryButton className="text-brace" onClick={() => onDelete(product.id!)}><Trash2 className="h-4 w-4" /> Elimina</SecondaryButton>}
          <PrimaryButton className="flex-1" disabled={!valid || uploading} onClick={() => onSave({ id: product.id, ...f, price })}>Salva</PrimaryButton>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <ProductImage src={f.image_url} alt="" emptyBox className="h-24 w-24 shrink-0 rounded-xl" sizes="96px" />
          <div className="space-y-2">
            <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ring-lava/15 hover:bg-lava/5">
              <ImagePlus className="h-4 w-4" /> {uploading ? "Caricamento…" : "Carica foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {f.image_url && <button type="button" className="block text-sm text-brace" onClick={() => setF({ ...f, image_url: null })}>Rimuovi foto</button>}
            {uploadError && <p className="text-sm text-brace">{uploadError}</p>}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <label className="text-sm font-medium">Nome<input className={`${adminInput} mt-1`} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <label className="text-sm font-medium">Prezzo €<input inputMode="decimal" className={`${adminInput} mt-1`} value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
        </div>
        <label className="block text-sm font-medium">
          Ingredienti / descrizione <span className="font-normal text-pietra">(separati da virgola: diventano “togli ingrediente”)</span>
          <textarea rows={2} className={`${adminInput} mt-1 h-auto py-2`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </label>
        <label className="block text-sm font-medium">
          Categoria
          <select className={`${adminInput} mt-1`} value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-x-6">
          <Toggle checked={f.is_available} onChange={(v) => setF({ ...f, is_available: v })} label="Disponibile oggi" />
          <Toggle checked={f.is_featured} onChange={(v) => setF({ ...f, is_featured: v })} label="In evidenza in home" />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Allergeni (Reg. UE 1169/2011)</legend>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {ALLERGENS.map((a) => (
              <label key={a.code} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-white px-2 text-sm ring-1 ring-lava/10">
                <input type="checkbox" className="h-4 w-4 accent-brace" checked={f.allergens.includes(a.code)} onChange={() => toggleIn("allergens", a.code)} />
                <span aria-hidden="true">{a.icon}</span> {a.short}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Badge</legend>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <button key={t.code} type="button" aria-pressed={f.tags.includes(t.code)} onClick={() => toggleIn("tags", t.code)} className={`h-9 rounded-full px-3 text-sm ring-1 ${f.tags.includes(t.code) ? "bg-lava text-crema ring-lava" : "bg-white ring-lava/15"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Personalizzazioni disponibili</legend>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <button key={g.id} type="button" aria-pressed={f.modifier_group_ids.includes(g.id)} onClick={() => toggleIn("modifier_group_ids", g.id)} className={`h-9 rounded-full px-3 text-sm ring-1 ${f.modifier_group_ids.includes(g.id) ? "bg-lava text-crema ring-lava" : "bg-white ring-lava/15"}`}>
                {g.name}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}

function GroupEditor({ group, onClose, onSave }: { group: Partial<ModifierGroupWithOptions>; onClose: () => void; onSave: (d: Parameters<typeof saveModifierGroup>[0]) => void }) {
  const [name, setName] = useState(group.name ?? "");
  const [type, setType] = useState<"single" | "multiple">(group.type ?? "multiple");
  const [required, setRequired] = useState(group.required ?? false);
  const [max, setMax] = useState(group.max != null ? String(group.max) : "");
  const [mods, setMods] = useState(
    (group.modifiers ?? []).map((m) => ({ id: m.id as string | undefined, name: m.name, price: String(m.price_delta), is_default: m.is_default, is_available: m.is_available })),
  );
  const update = (i: number, patch: Partial<(typeof mods)[number]>) => setMods((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const valid = name.trim() && mods.every((m) => m.name.trim() && !Number.isNaN(Number(m.price.replace(",", "."))));

  return (
    <Modal
      title={group.id ? "Modifica personalizzazione" : "Nuova personalizzazione"}
      onClose={onClose}
      footer={
        <PrimaryButton
          className="w-full"
          disabled={!valid}
          onClick={() =>
            onSave({
              id: group.id,
              name,
              type,
              required,
              max: max ? Number(max) : null,
              modifiers: mods.map((m) => ({ id: m.id, name: m.name, price_delta: Number(m.price.replace(",", ".")) || 0, is_default: m.is_default, is_available: m.is_available })),
            })
          }
        >
          Salva
        </PrimaryButton>
      }
    >
      <div className="space-y-3">
        <label className="block text-sm font-medium">Nome<input className={`${adminInput} mt-1`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Impasto" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Tipo
            <select className={`${adminInput} mt-1`} value={type} onChange={(e) => setType(e.target.value as "single" | "multiple")}>
              <option value="single">Scelta singola</option>
              <option value="multiple">Scelta multipla</option>
            </select>
          </label>
          {type === "multiple" && <label className="text-sm font-medium">Max scelte<input inputMode="numeric" className={`${adminInput} mt-1`} value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} /></label>}
        </div>
        <Toggle checked={required} onChange={setRequired} label="Obbligatorio" />
        <div className="space-y-2">
          {mods.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_auto] items-center gap-2 rounded-xl bg-white p-2 ring-1 ring-lava/10">
              <input className={adminInput} value={m.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Opzione" aria-label="Nome opzione" />
              <input className={adminInput} inputMode="decimal" value={m.price} onChange={(e) => update(i, { price: e.target.value })} aria-label="Supplemento €" placeholder="+€" />
              <button type="button" onClick={() => setMods((ms) => ms.filter((_, idx) => idx !== i))} className="flex h-10 w-10 items-center justify-center text-brace" aria-label="Rimuovi opzione"><Trash2 className="h-4 w-4" /></button>
              <div className="col-span-3 flex flex-wrap gap-x-4">
                <Toggle checked={m.is_available} onChange={(v) => update(i, { is_available: v })} label="Disponibile" />
                {type === "single" && <Toggle checked={m.is_default} onChange={(v) => setMods((ms) => ms.map((x, idx) => ({ ...x, is_default: idx === i ? v : false })))} label="Predefinita" />}
              </div>
            </div>
          ))}
          <SecondaryButton onClick={() => setMods((ms) => [...ms, { id: undefined, name: "", price: "0", is_default: false, is_available: true }])}><Plus className="h-4 w-4" /> Opzione</SecondaryButton>
        </div>
      </div>
    </Modal>
  );
}
