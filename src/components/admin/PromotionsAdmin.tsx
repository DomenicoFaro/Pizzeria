"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDiscount, saveDiscount } from "@/app/admin/actions";
import { formatEuro } from "@/lib/pricing";
import { formatDateTime } from "@/lib/time";
import type { DiscountCode } from "@/lib/types";
import { adminInput, Card, PrimaryButton, Toggle } from "./ui";

export function PromotionsAdmin({ codes }: { codes: DiscountCode[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ code: "", type: "percent" as "percent" | "fixed", value: "10", min_order: "0", expires_at: "", max_uses: "" });

  const exec = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Errore");
      else {
        after?.();
        router.refresh();
      }
    });

  const create = () =>
    exec(
      () =>
        saveDiscount({
          code: f.code,
          type: f.type,
          value: Number(f.value.replace(",", ".")),
          min_order: Number(f.min_order.replace(",", ".")) || 0,
          expires_at: f.expires_at || null,
          max_uses: f.max_uses ? Number(f.max_uses) : null,
          is_active: true,
        }),
      () => setF({ ...f, code: "" }),
    );

  const toggle = (c: DiscountCode) =>
    exec(() => saveDiscount({ code: c.code, type: c.type, value: Number(c.value), min_order: Number(c.min_order), expires_at: c.expires_at, max_uses: c.max_uses, is_active: !c.is_active }));

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl font-bold">Promozioni</h1>
      <Card title="Nuovo codice sconto">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">Codice<input className={`${adminInput} mt-1 uppercase`} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="ESTATE10" /></label>
          <label className="text-sm font-medium">
            Tipo
            <select className={`${adminInput} mt-1`} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as "percent" | "fixed" })}>
              <option value="percent">Percentuale %</option>
              <option value="fixed">Importo fisso €</option>
            </select>
          </label>
          <label className="text-sm font-medium">Valore<input inputMode="decimal" className={`${adminInput} mt-1`} value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></label>
          <label className="text-sm font-medium">Ordine minimo €<input inputMode="decimal" className={`${adminInput} mt-1`} value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} /></label>
          <label className="text-sm font-medium">Scadenza<input type="datetime-local" className={`${adminInput} mt-1`} value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></label>
          <label className="text-sm font-medium">Utilizzi massimi<input inputMode="numeric" className={`${adminInput} mt-1`} value={f.max_uses} onChange={(e) => setF({ ...f, max_uses: e.target.value.replace(/\D/g, "") })} placeholder="illimitati" /></label>
        </div>
        {error && <p className="mt-3 text-sm text-brace">{error}</p>}
        <PrimaryButton className="mt-4" disabled={f.code.length < 3} onClick={create}>Crea codice</PrimaryButton>
      </Card>
      <Card title="Codici">
        <ul className="divide-y divide-lava/5">
          {codes.map((c) => (
            <li key={c.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-mono text-lg font-bold">{c.code}</p>
                <p className="text-sm text-pietra">
                  {c.type === "percent" ? `-${Number(c.value)}%` : `-${formatEuro(Number(c.value))}`} · min {formatEuro(Number(c.min_order))} · usato {c.used}
                  {c.max_uses ? `/${c.max_uses}` : ""} volte{c.expires_at ? ` · scade ${formatDateTime(c.expires_at)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Toggle checked={c.is_active} onChange={() => toggle(c)} label={c.is_active ? "Attivo" : "Disattivo"} />
                <button type="button" onClick={() => confirm(`Eliminare ${c.code}?`) && exec(() => deleteDiscount(c.code))} className="flex h-10 w-10 items-center justify-center text-brace" aria-label={`Elimina ${c.code}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
          {codes.length === 0 && <li className="py-4 text-pietra">Nessun codice.</li>}
        </ul>
      </Card>
    </div>
  );
}
