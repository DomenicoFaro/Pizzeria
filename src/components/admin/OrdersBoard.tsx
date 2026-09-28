"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Bell, BellOff, Bike, Clock, ExternalLink, MapPin, Pause, Phone, Play, Printer, Store, X } from "lucide-react";
import { acceptOrder, markPaid, rejectOrder, setOrderStatus, setOrdersPaused, updateEta } from "@/app/admin/actions";
import { NEXT_STATUS, PAYMENT_LABELS, statusLabel } from "@/lib/order-status";
import { normalizeOrder } from "@/lib/orders-client";
import { formatEuro } from "@/lib/pricing";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { formatDateTime, formatTime } from "@/lib/time";
import type { OrderStatus, OrderWithItems } from "@/lib/types";
import { useAlarm } from "./useAlarm";

/** orario corrente (usato solo nei gestori di eventi e nel pannello aperto) */
const nowMs = () => Date.now();

const COLUMNS: { key: string; title: string; statuses: OrderStatus[] }[] = [
  { key: "new", title: "Nuovi", statuses: ["nuovo"] },
  { key: "prep", title: "In preparazione", statuses: ["accettato", "in_preparazione"] },
  { key: "ready", title: "Pronti / In consegna", statuses: ["pronto", "in_consegna"] },
  { key: "done", title: "Completati oggi", statuses: ["completato", "rifiutato", "annullato"] },
];

export function OrdersBoard({ initialOrders, initialPaused }: { initialOrders: OrderWithItems[]; initialPaused: boolean }) {
  const [orders, setOrders] = useState(initialOrders);
  const [paused, setPaused] = useState(initialPaused);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const newCount = orders.filter((o) => o.status === "nuovo").length;
  const alarm = useAlarm(newCount > 0);

  const upsert = useCallback((o: OrderWithItems) => {
    setOrders((prev) => {
      const exists = prev.some((p) => p.id === o.id);
      return exists ? prev.map((p) => (p.id === o.id ? o : p)) : [o, ...prev];
    });
  }, []);

  // Realtime: nuovi ordini e cambi di stato
  useEffect(() => {
    const sb = getBrowserSupabase();
    const fetchOne = async (id: string) => {
      const { data } = await sb.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
      if (data && data.status !== "in_attesa_pagamento") {
        const o = normalizeOrder(data as OrderWithItems);
        upsert(o);
        return o;
      }
    };
    const channel = sb
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, async (payload) => {
        const row = payload.new as { id?: string; status?: string };
        if (!row?.id) return;
        const o = await fetchOne(row.id);
        if (o?.status === "nuovo") {
          setFlash(`Nuovo ordine n° ${o.number} — ${o.customer_name}`);
          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            new Notification(`Nuovo ordine n° ${o.number}`, { body: `${o.type === "delivery" ? "Consegna" : "Asporto"} · ${formatEuro(o.total)}` });
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "settings" }, (payload) => {
        setPaused(Boolean((payload.new as { orders_paused?: boolean }).orders_paused));
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    // rete di sicurezza: ricarico gli ordini attivi ogni 30 s
    const poll = setInterval(async () => {
      const { data } = await sb.from("orders").select("*, order_items(*)").in("status", ["nuovo", "accettato", "in_preparazione", "pronto", "in_consegna"]);
      (data ?? []).forEach((d) => upsert(normalizeOrder(d as OrderWithItems)));
    }, 30_000);

    return () => {
      sb.removeChannel(channel);
      clearInterval(poll);
    };
  }, [upsert]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  const enableSound = async () => {
    await alarm.enable();
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  };

  const togglePause = () => {
    const next = !paused;
    if (next && !confirm("Sospendere gli ordini online? I clienti non potranno ordinare finché non li riattivi.")) return;
    setPaused(next);
    startTransition(async () => {
      const r = await setOrdersPaused(next);
      if (!r.ok) {
        setPaused(!next);
        alert(r.error);
      }
    });
  };

  const byColumn = useMemo(() => {
    const sorted = [...orders].sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
    return COLUMNS.map((c) => ({
      ...c,
      orders: c.key === "done" ? sorted.filter((o) => c.statuses.includes(o.status)).reverse() : sorted.filter((o) => c.statuses.includes(o.status)),
    }));
  }, [orders]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-serif text-3xl font-bold">Ordini live</h1>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${connected ? "bg-basilico/15 text-basilico" : "bg-lava/10 text-pietra"}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? "animate-pulse bg-basilico" : "bg-pietra"}`} /> {connected ? "Tempo reale attivo" : "Connessione…"}
        </span>
        <button
          type="button"
          onClick={alarm.enabled ? undefined : enableSound}
          className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ${alarm.enabled ? "bg-basilico/15 text-basilico" : "animate-pulse bg-oro text-lava"}`}
        >
          {alarm.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          {alarm.enabled ? "Suono attivo" : "Attiva suono"}
        </button>
        <button
          type="button"
          onClick={togglePause}
          className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white ${paused ? "bg-basilico" : "bg-brace"}`}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          {paused ? "Riattiva ordini online" : "Sospendi ordini online"}
        </button>
      </div>

      {paused && <p className="mb-4 rounded-2xl bg-brace/10 p-3 text-sm font-semibold text-brace">Gli ordini online sono SOSPESI: i clienti vedono il messaggio di pausa.</p>}
      {flash && (
        <button type="button" onClick={() => setFlash(null)} className="animate-slide-up fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full bg-brace px-6 py-3 font-semibold text-white shadow-2xl">
          🔔 {flash}
        </button>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {byColumn.map((col) => (
          <section key={col.key} className="flex min-h-40 flex-col rounded-3xl bg-white/60 p-3 ring-1 ring-lava/5" aria-labelledby={`col-${col.key}`}>
            <h2 id={`col-${col.key}`} className="mb-3 flex items-center justify-between px-1 font-semibold">
              {col.title}
              <span className={`rounded-full px-2.5 py-0.5 text-sm ${col.key === "new" && col.orders.length ? "bg-brace text-white" : "bg-lava/10"}`}>{col.orders.length}</span>
            </h2>
            <ul className="space-y-2">
              {col.orders.map((o) => (
                <li key={o.id}>
                  <OrderCard order={o} onClick={() => setSelectedId(o.id)} />
                </li>
              ))}
              {col.orders.length === 0 && <li className="px-1 py-6 text-center text-sm text-pietra">Nessun ordine</li>}
            </ul>
          </section>
        ))}
      </div>

      {selected && <OrderDetail order={selected} onClose={() => setSelectedId(null)} onChange={upsert} />}
    </div>
  );
}

function OrderCard({ order: o, onClick }: { order: OrderWithItems; onClick: () => void }) {
  const isNew = o.status === "nuovo";
  const failed = o.status === "rifiutato" || o.status === "annullato";
  const time = o.estimated_ready_at ?? o.scheduled_for;
  const items = o.order_items.reduce((s, i) => s + i.quantity, 0);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl bg-white p-3 text-left shadow-sm ring-1 transition hover:shadow-md ${
        isNew ? "animate-pulse ring-2 ring-brace" : failed ? "opacity-60 ring-lava/10" : "ring-lava/10"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold">n° {o.number}</span>
        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${o.type === "delivery" ? "bg-oro/20 text-oro-dark" : "bg-basilico/15 text-basilico"}`}>
          {o.type === "delivery" ? <Bike className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
          {o.type === "delivery" ? "Consegna" : "Asporto"}
        </span>
      </div>
      <p className="mt-1 truncate font-medium">{o.customer_name}</p>
      <div className="mt-1 flex items-center justify-between text-sm text-pietra">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {o.asap && isNew ? "Prima possibile" : formatTime(time)}
          {!o.asap && isNew && <span className="ml-1 rounded bg-oro/20 px-1 text-[10px] font-bold text-oro-dark">PROGRAMMATO</span>}
        </span>
        <span className="font-semibold text-lava">{formatEuro(o.total)}</span>
      </div>
      <p className="mt-1 text-xs text-pietra">
        {items} articoli · {PAYMENT_LABELS[o.payment_method]}
        {o.payment_status === "paid" ? " ✓ pagato" : ""} · {statusLabel(o.status, o.type)}
      </p>
    </button>
  );
}

function OrderDetail({ order: o, onClose, onChange }: { order: OrderWithItems; onClose: () => void; onChange: (o: OrderWithItems) => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, optimistic?: Partial<OrderWithItems>) => {
    setError(null);
    if (optimistic) onChange({ ...o, ...optimistic });
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setError(r.error ?? "Errore");
        onChange(o);
      }
    });
  };

  const accept = (minutes: number | "scheduled") => {
    const base = nowMs();
    const readyAt = minutes === "scheduled" ? new Date(o.scheduled_for) : new Date(base + minutes * 60_000);
    act(() => acceptOrder(o.id, readyAt.toISOString()), { status: "accettato", estimated_ready_at: readyAt.toISOString() });
  };

  const shiftEta = (minutes: number) => {
    const current = new Date(o.estimated_ready_at ?? o.scheduled_for).getTime();
    const next = new Date(current + minutes * 60_000).toISOString();
    act(() => updateEta(o.id, next), { estimated_ready_at: next });
  };

  const next = NEXT_STATUS[o.status]?.(o.type);
  const a = o.address;
  const mapsUrl = a ? `https://www.google.com/maps/search/?api=1&query=${a.lat && a.lng ? `${a.lat},${a.lng}` : encodeURIComponent(`${a.street} ${a.number}, ${a.cap} ${a.city}`)}` : null;
  const scheduledFuture = new Date(o.scheduled_for).getTime() > nowMs() + 50 * 60_000;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={`Ordine ${o.number}`}>
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Chiudi" />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto bg-crema shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-lava/10 bg-crema px-5 py-4">
          <div>
            <p className="text-sm text-pietra">{o.type === "delivery" ? "Consegna" : "Asporto"} · ricevuto {formatTime(o.created_at)}</p>
            <h2 className="font-serif text-2xl font-bold">Ordine n° {o.number}</h2>
          </div>
          <div className="flex gap-1">
            <Link href={`/admin/stampa/${o.id}`} target="_blank" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Stampa comanda">
              <Printer className="h-5 w-5" />
            </Link>
            <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Chiudi">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-lava/5">
            <p className="text-sm text-pietra">Stato</p>
            <p className="text-xl font-bold">{statusLabel(o.status, o.type)}</p>
            <p className="mt-1 text-sm">
              Richiesto: <strong>{o.asap ? "prima possibile" : formatDateTime(o.scheduled_for)}</strong>
              {o.estimated_ready_at && <> · Previsto: <strong>{formatTime(o.estimated_ready_at)}</strong></>}
            </p>
            {o.status_reason && <p className="mt-1 text-sm text-brace">Motivo: {o.status_reason}</p>}
          </div>

          {error && <p className="rounded-xl bg-brace/10 p-3 text-sm text-brace" role="alert">{error}</p>}

          {o.status === "nuovo" && !rejecting && (
            <div className="rounded-2xl bg-white p-4 ring-2 ring-brace">
              <p className="mb-3 font-semibold">Accetta e imposta l&apos;orario {o.type === "delivery" ? "di consegna" : "di ritiro"}</p>
              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 45].map((m) => (
                  <button key={m} type="button" disabled={pending} onClick={() => accept(m)} className="h-14 rounded-xl bg-basilico text-lg font-bold text-white hover:brightness-110 disabled:opacity-50">
                    +{m} min
                  </button>
                ))}
              </div>
              {(!o.asap || scheduledFuture) && (
                <button type="button" disabled={pending} onClick={() => accept("scheduled")} className="mt-2 h-12 w-full rounded-xl bg-lava font-semibold text-crema disabled:opacity-50">
                  Conferma per le {formatTime(o.scheduled_for)}
                </button>
              )}
              <button type="button" onClick={() => setRejecting(true)} className="mt-2 h-11 w-full rounded-xl text-sm font-semibold text-brace ring-1 ring-brace/30">
                Rifiuta ordine
              </button>
            </div>
          )}

          {rejecting && (
            <div className="rounded-2xl bg-white p-4 ring-2 ring-brace">
              <label htmlFor="reason" className="font-semibold">Motivo (visibile al cliente)</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Siamo al completo", "Fuori zona di consegna", "Prodotto esaurito", "Richiesta del cliente"].map((r) => (
                  <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full bg-lava/5 px-3 py-1.5 text-sm">{r}</button>
                ))}
              </div>
              <input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2 h-11 w-full rounded-xl bg-crema px-3 ring-1 ring-lava/15" />
              {o.payment_status === "paid" && <p className="mt-2 text-sm text-pietra">L&apos;ordine è pagato online: il rimborso partirà automaticamente.</p>}
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setRejecting(false)} className="h-11 flex-1 rounded-xl ring-1 ring-lava/15">Indietro</button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    const status = o.status === "nuovo" ? "rifiutato" : "annullato";
                    act(() => rejectOrder(o.id, status, reason), { status, status_reason: reason });
                    setRejecting(false);
                  }}
                  className="h-11 flex-1 rounded-xl bg-brace font-semibold text-white disabled:opacity-50"
                >
                  Conferma {o.status === "nuovo" ? "rifiuto" : "annullamento"}
                </button>
              </div>
            </div>
          )}

          {next && (
            <div className="space-y-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => setOrderStatus(o.id, next), { status: next })}
                className="h-14 w-full rounded-2xl bg-brace text-lg font-bold text-white shadow-lg shadow-brace/25 disabled:opacity-50"
              >
                → {statusLabel(next, o.type)}
              </button>
              {["accettato", "in_preparazione"].includes(o.status) && (
                <div className="flex gap-2">
                  {[5, 10, 15].map((m) => (
                    <button key={m} type="button" onClick={() => shiftEta(m)} className="h-10 flex-1 rounded-xl text-sm font-medium ring-1 ring-lava/15">
                      Ritarda +{m}′
                    </button>
                  ))}
                </div>
              )}
              {!rejecting && (
                <button type="button" onClick={() => setRejecting(true)} className="h-10 w-full rounded-xl text-sm text-brace">
                  Annulla ordine
                </button>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-white p-4 ring-1 ring-lava/5">
            <h3 className="font-semibold">Prodotti</h3>
            <ul className="mt-2 divide-y divide-lava/5">
              {o.order_items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-2">
                  <div>
                    <p className="font-semibold"><span className="text-lg">{i.quantity}×</span> {i.name}</p>
                    {i.modifiers.map((m, idx) => (
                      <p key={idx} className={`text-sm ${m.group === "Senza" ? "font-semibold text-brace" : "text-pietra"}`}>
                        {m.group === "Senza" ? `SENZA ${m.name}` : `${m.group}: ${m.name}`}
                      </p>
                    ))}
                    {i.notes && <p className="text-sm font-semibold text-oro-dark">“{i.notes}”</p>}
                  </div>
                  <span className="shrink-0 tabular-nums">{formatEuro(i.unit_price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            {o.notes && <p className="mt-2 rounded-xl bg-oro/15 p-2 text-sm"><strong>Note:</strong> {o.notes}</p>}
            <dl className="mt-3 space-y-1 border-t border-lava/10 pt-2 text-sm">
              <div className="flex justify-between"><dt>Subtotale</dt><dd>{formatEuro(o.subtotal)}</dd></div>
              {o.type === "delivery" && <div className="flex justify-between"><dt>Consegna</dt><dd>{formatEuro(o.delivery_fee)}</dd></div>}
              {o.discount > 0 && <div className="flex justify-between"><dt>Sconto {o.discount_code}</dt><dd>−{formatEuro(o.discount)}</dd></div>}
              <div className="flex justify-between text-base font-bold"><dt>Totale</dt><dd>{formatEuro(o.total)}</dd></div>
            </dl>
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-lava/5">
            <h3 className="font-semibold">Cliente</h3>
            <p className="mt-1">{o.customer_name}</p>
            <a href={`tel:${o.customer_phone.replace(/[^+\d]/g, "")}`} className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-lava/5 px-3 font-semibold">
              <Phone className="h-4 w-4" /> {o.customer_phone}
            </a>
            {a && (
              <div className="mt-3">
                <p className="flex gap-2">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-brace" />
                  <span>
                    {a.street} {a.number}, {a.cap} {a.city}
                    {a.intercom && <><br />Citofono: {a.intercom}</>}
                    {a.floor && <><br />{a.floor}</>}
                    {a.notes && <><br /><em>{a.notes}</em></>}
                    {o.zone_name && <><br /><span className="text-sm text-pietra">{o.zone_name}</span></>}
                  </span>
                </p>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-lava/5 px-3 font-semibold">
                    <ExternalLink className="h-4 w-4" /> Apri in Google Maps
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-4 ring-1 ring-lava/5">
            <h3 className="font-semibold">Pagamento</h3>
            <p className="mt-1">
              {PAYMENT_LABELS[o.payment_method]} ·{" "}
              <strong className={o.payment_status === "paid" ? "text-basilico" : ""}>
                {{ paid: "pagato", pending: "in attesa", unpaid: "da incassare", refunded: "rimborsato", failed: "fallito" }[o.payment_status]}
              </strong>
            </p>
            {o.change_for && <p className="mt-1 font-semibold text-oro-dark">Resto da {formatEuro(o.change_for)} (dare {formatEuro(o.change_for - o.total)})</p>}
            {o.payment_status === "unpaid" && o.status === "completato" && (
              <button type="button" onClick={() => act(() => markPaid(o.id), { payment_status: "paid" })} className="mt-2 h-10 rounded-xl px-3 text-sm font-medium ring-1 ring-lava/15">
                Segna come incassato
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
