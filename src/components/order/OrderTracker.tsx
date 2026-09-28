"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bike, Check, ChefHat, CircleCheck, Clock, PartyPopper, Phone, Store, XCircle } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { useSiteInfo } from "@/components/site/SiteInfo";
import { statusLabel, trackingSteps, PAYMENT_LABELS } from "@/lib/order-status";
import { formatEuro } from "@/lib/pricing";
import type { PublicOrder } from "@/lib/public-order";
import { fullAddress, telHref } from "@/lib/site";
import { formatDateTime, formatTime } from "@/lib/time";
import type { OrderStatus } from "@/lib/types";

const STEP_ICONS: Partial<Record<OrderStatus, typeof Check>> = {
  nuovo: Clock,
  accettato: Check,
  in_preparazione: ChefHat,
  pronto: Store,
  in_consegna: Bike,
  completato: CircleCheck,
};

export function OrderTracker({ initial, justPlaced }: { initial: PublicOrder; justPlaced: boolean }) {
  const [order, setOrder] = useState(initial);
  const { clear } = useCart();
  const { settings } = useSiteInfo();

  // svuota il carrello dopo un ordine andato a buon fine
  useEffect(() => {
    if (justPlaced && !["annullato", "rifiutato"].includes(order.status)) clear();
  }, [justPlaced, order.status, clear]);

  // Aggiornamenti di stato: polling leggero.
  // Niente Realtime: i dati dell'ordine si leggono solo dal server conoscendo l'ID.
  const live = !["completato", "rifiutato", "annullato"].includes(order.status);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/orders/${initial.id}`, { cache: "no-store" });
      if (res.ok) setOrder(await res.json());
    }, 10000);
    return () => clearInterval(t);
  }, [initial.id, live]);

  const steps = trackingSteps(order.type);
  const currentIndex = steps.indexOf(order.status);
  const failed = order.status === "rifiutato" || order.status === "annullato";
  const eta = order.estimated_ready_at ?? order.scheduled_for;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {justPlaced && !failed && order.status !== "in_attesa_pagamento" && (
        <div className="animate-slide-up flex items-center gap-4 rounded-3xl bg-basilico p-5 text-white">
          <PartyPopper className="h-10 w-10 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-serif text-2xl font-bold">Grazie {order.first_name}!</p>
            <p className="text-white/90">Ordine n° {order.number} ricevuto. {order.payment_status === "paid" ? "Pagamento completato." : ""}</p>
          </div>
        </div>
      )}

      <section className="rounded-3xl bg-white p-6 ring-1 ring-lava/5" aria-live="polite">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-pietra">Ordine n° {order.number} · {order.type === "delivery" ? "Consegna" : "Asporto"}</p>
            <h1 className="mt-1 font-serif text-3xl font-bold">{statusLabel(order.status, order.type)}</h1>
          </div>
          {live && (
            <span className="flex items-center gap-1.5 rounded-full bg-basilico/10 px-2.5 py-1 text-xs font-semibold text-basilico">
              <span className="h-2 w-2 animate-pulse rounded-full bg-basilico" /> Live
            </span>
          )}
        </div>

        {failed ? (
          <div className="mt-5 flex gap-3 rounded-2xl bg-brace/10 p-4 text-brace">
            <XCircle className="h-6 w-6 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Ci dispiace, l&apos;ordine è stato {order.status}.</p>
              {order.status_reason && <p className="text-sm">Motivo: {order.status_reason}</p>}
              <a href={telHref(settings.phone)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold underline">
                <Phone className="h-4 w-4" aria-hidden="true" /> Chiamaci
              </a>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-3 text-lg">
              {order.status === "nuovo"
                ? `Richiesto per ${order.asap ? "prima possibile" : formatDateTime(order.scheduled_for)} — in attesa di conferma dal locale.`
                : order.status === "completato"
                  ? "Buon appetito! 🍕"
                  : `${order.type === "delivery" ? "Consegna prevista" : "Pronto per il ritiro"} alle `}
              {!["nuovo", "completato", "in_attesa_pagamento"].includes(order.status) && <strong className="text-brace">{formatTime(eta)}</strong>}
            </p>

            <ol className="mt-6 grid grid-cols-5 gap-1" aria-label="Avanzamento ordine">
              {steps.map((s, i) => {
                const done = currentIndex >= i;
                const Icon = STEP_ICONS[s] ?? Check;
                return (
                  <li key={s} className="flex flex-col items-center text-center">
                    <div className="relative flex w-full items-center justify-center">
                      {i > 0 && <span className={`absolute right-1/2 top-1/2 h-1 w-full -translate-y-1/2 ${currentIndex >= i ? "bg-basilico" : "bg-lava/10"}`} />}
                      <span
                        className={`relative flex h-10 w-10 items-center justify-center rounded-full transition ${
                          done ? "bg-basilico text-white" : "bg-lava/10 text-pietra"
                        } ${currentIndex === i ? "ring-4 ring-basilico/25" : ""}`}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </div>
                    <span className={`mt-2 text-[11px] leading-tight sm:text-xs ${done ? "font-semibold" : "text-pietra"}`}>{statusLabel(s, order.type)}</span>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 ring-1 ring-lava/5">
        <h2 className="font-serif text-xl font-bold">Dettagli</h2>
        <p className="mt-2 text-sm text-pietra">
          {order.type === "delivery" && order.address
            ? `Consegna a: ${order.address.street} ${order.address.number}, ${order.address.city}`
            : `Ritiro: ${fullAddress}`}
          <br />
          Pagamento: {PAYMENT_LABELS[order.payment_method]} {order.payment_status === "paid" ? "· pagato" : "· alla consegna/al ritiro"}
        </p>
        <ul className="mt-4 divide-y divide-lava/5 text-sm">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-3 py-2">
              <span>
                <strong>{i.quantity}×</strong> {i.name}
                {i.modifiers.length > 0 && (
                  <span className="block text-xs text-pietra">{i.modifiers.map((m) => (m.group === "Senza" ? `senza ${m.name}` : m.name)).join(" · ")}</span>
                )}
                {i.notes && <span className="block text-xs italic text-pietra">{i.notes}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{formatEuro(i.unit_price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-lava/10 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-pietra">Subtotale</dt><dd>{formatEuro(order.subtotal)}</dd></div>
          {order.type === "delivery" && <div className="flex justify-between"><dt className="text-pietra">Consegna</dt><dd>{formatEuro(order.delivery_fee)}</dd></div>}
          {order.discount > 0 && <div className="flex justify-between text-basilico"><dt>Sconto {order.discount_code}</dt><dd>−{formatEuro(order.discount)}</dd></div>}
          <div className="flex justify-between pt-1 text-base font-bold"><dt>Totale</dt><dd>{formatEuro(order.total)}</dd></div>
        </dl>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a href={telHref(settings.phone)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-lava font-semibold text-crema">
          <Phone className="h-5 w-5" aria-hidden="true" /> Chiama il locale
        </a>
        <Link href="/ordina" className="flex h-12 flex-1 items-center justify-center rounded-full ring-1 ring-lava/20 font-semibold hover:bg-white">
          Torna al menù
        </Link>
      </div>
      <p className="text-center text-xs text-pietra">Salva questa pagina: il link ti permette di seguire l&apos;ordine in qualsiasi momento.</p>
    </div>
  );
}
