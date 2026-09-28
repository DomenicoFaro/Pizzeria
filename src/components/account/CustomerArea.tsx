"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Mail, RotateCcw } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { useCart } from "@/components/cart/CartProvider";
import { inputClass } from "@/components/forms/Field";
import { statusLabel } from "@/lib/order-status";
import { formatEuro } from "@/lib/pricing";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { formatDateTime } from "@/lib/time";
import type { OrderWithItems } from "@/lib/types";

export function CustomerArea() {
  const params = useSearchParams();
  const router = useRouter();
  const next = params.get("next");
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("errore") ? "Accesso non riuscito, riprova." : null);
  const { addLine, setDrawerOpen } = useCart();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getBrowserSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (!data.user) return;
      if (next) return router.replace(next);
      const { data: rows } = await sb.from("orders").select("*, order_items(*)").neq("status", "in_attesa_pagamento").order("created_at", { ascending: false }).limit(30);
      setOrders((rows as OrderWithItems[]) ?? []);
    });
  }, [next, router]);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next ?? "/area-cliente")}`;

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getBrowserSupabase().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  const google = async () => {
    await getBrowserSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
  };

  const logout = async () => {
    await getBrowserSupabase().auth.signOut();
    setUser(null);
    setOrders([]);
  };

  const reorder = (o: OrderWithItems) => {
    for (const i of o.order_items) {
      if (!i.product_id) continue;
      addLine({
        productId: i.product_id,
        name: i.name,
        quantity: i.quantity,
        modifierIds: i.modifiers.filter((m) => m.id).map((m) => m.id!),
        removed: i.modifiers.filter((m) => m.group === "Senza").map((m) => m.name),
        notes: i.notes ?? "",
        unitPrice: Number(i.unit_price),
        modifierLabels: i.modifiers.map((m) => (m.group === "Senza" ? `senza ${m.name}` : m.price_delta > 0 ? `+ ${m.name}` : m.name)),
      });
    }
    setDrawerOpen(true);
  };

  if (user === undefined && isSupabaseConfigured) return <div className="mx-auto h-48 max-w-2xl animate-pulse rounded-3xl bg-white/70" />;

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-6 ring-1 ring-lava/5 sm:p-8">
        <h2 className="font-serif text-2xl font-bold">Accedi</h2>
        <p className="mt-1 text-pietra">Ritrova i tuoi ordini, riordina in un tocco e salva gli indirizzi. Nessuna password: ti mandiamo un link via email.</p>
        {sent ? (
          <p className="mt-6 rounded-xl bg-basilico/10 p-4 text-basilico" role="status">Controlla la tua casella: ti abbiamo inviato il link di accesso a <strong>{email}</strong>.</p>
        ) : (
          <form onSubmit={sendLink} className="mt-6 space-y-3">
            <label htmlFor="login-email" className="sr-only">Email</label>
            <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="la-tua@email.it" className={`${inputClass} h-12`} />
            <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brace font-semibold text-white disabled:opacity-60">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Mail className="h-5 w-5" aria-hidden="true" />} Inviami il link
            </button>
          </form>
        )}
        <div className="my-5 flex items-center gap-3 text-xs text-pietra"><span className="h-px flex-1 bg-lava/10" />oppure<span className="h-px flex-1 bg-lava/10" /></div>
        <button type="button" onClick={google} className="flex h-12 w-full items-center justify-center gap-2 rounded-full font-semibold ring-1 ring-lava/20 hover:bg-crema">
          Continua con Google
        </button>
        {error && <p className="mt-4 text-sm text-brace" role="alert">{error}</p>}
        <p className="mt-6 text-center text-sm text-pietra">Puoi anche ordinare come ospite, senza account.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-pietra">Accesso come <strong className="text-lava">{user.email}</strong></p>
        <button type="button" onClick={logout} className="flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium ring-1 ring-lava/15 hover:bg-white">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Esci
        </button>
      </div>
      {orders.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center ring-1 ring-lava/5">
          <p>Non hai ancora ordini.</p>
          <Link href="/ordina" className="mt-4 inline-flex h-12 items-center rounded-full bg-brace px-6 font-semibold text-white">Ordina ora</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-3xl bg-white p-5 ring-1 ring-lava/5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">Ordine n° {o.number} · {formatEuro(Number(o.total))}</p>
                  <p className="text-sm text-pietra">{formatDateTime(o.created_at)} · {o.type === "delivery" ? "Consegna" : "Asporto"} · {statusLabel(o.status, o.type)}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/ordine/${o.id}`} className="flex h-11 items-center rounded-full px-4 text-sm font-medium ring-1 ring-lava/15 hover:bg-crema">Dettagli</Link>
                  <button type="button" onClick={() => reorder(o)} className="flex h-11 items-center gap-2 rounded-full bg-lava px-4 text-sm font-semibold text-crema">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" /> Riordina
                  </button>
                </div>
              </div>
              <p className="mt-2 text-sm text-pietra">{o.order_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
