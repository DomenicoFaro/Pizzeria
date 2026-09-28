"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Phone } from "lucide-react";
import { setBookingStatus } from "@/app/admin/actions";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { formatDate, formatDateTime } from "@/lib/time";
import type { EventRequest, Reservation } from "@/lib/types";
import { Card } from "./ui";

type Status = "in_attesa" | "confermata" | "rifiutata";
const STATUS_STYLE: Record<Status, string> = {
  in_attesa: "bg-oro/20 text-oro-dark",
  confermata: "bg-basilico/15 text-basilico",
  rifiutata: "bg-brace/10 text-brace",
};
const LABEL: Record<Status, string> = { in_attesa: "In attesa", confermata: "Confermata", rifiutata: "Rifiutata" };

export function BookingsAdmin({ reservations, events }: { reservations: Reservation[]; events: EventRequest[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"tavoli" | "eventi">("tavoli");
  const [, startTransition] = useTransition();

  // nuove prenotazioni in tempo reale
  useEffect(() => {
    const sb = getBrowserSupabase();
    const ch = sb.channel("admin-bookings").on("postgres_changes", { event: "INSERT", schema: "public", table: "reservations" }, () => router.refresh()).subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [router]);

  const set = (table: "reservations" | "event_requests", id: string, status: Status) =>
    startTransition(async () => {
      const r = await setBookingStatus(table, id, status);
      if (!r.ok) alert(r.error);
      router.refresh();
    });

  const actions = (table: "reservations" | "event_requests", id: string, status: Status) => (
    <div className="flex gap-2">
      {status !== "confermata" && <button type="button" onClick={() => set(table, id, "confermata")} className="h-10 rounded-full bg-basilico px-4 text-sm font-semibold text-white">Conferma</button>}
      {status !== "rifiutata" && <button type="button" onClick={() => set(table, id, "rifiutata")} className="h-10 rounded-full px-4 text-sm font-semibold text-brace ring-1 ring-brace/30">Rifiuta</button>}
    </div>
  );

  const pendingR = reservations.filter((r) => r.status === "in_attesa").length;
  const pendingE = events.filter((r) => r.status === "in_attesa").length;

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl font-bold">Prenotazioni ed eventi</h1>
      <div className="flex gap-2" role="tablist">
        {(["tavoli", "eventi"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-11 rounded-full px-5 text-sm font-semibold ${tab === t ? "bg-lava text-crema" : "bg-white ring-1 ring-lava/10"}`}>
            {t === "tavoli" ? `Tavoli (${pendingR} da gestire)` : `Eventi (${pendingE} da gestire)`}
          </button>
        ))}
      </div>
      {tab === "tavoli" ? (
        <Card>
          <ul className="divide-y divide-lava/5">
            {reservations.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold capitalize">{formatDate(r.date)} · {r.time.slice(0, 5)} · {r.people} pers.</p>
                  <p className="text-sm">{r.name} · <a className="font-semibold underline" href={`tel:${r.phone.replace(/[^+\d]/g, "")}`}><Phone className="inline h-3.5 w-3.5" /> {r.phone}</a></p>
                  {r.notes && <p className="text-sm italic text-pietra">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{LABEL[r.status]}</span>
                  {actions("reservations", r.id, r.status)}
                </div>
              </li>
            ))}
            {reservations.length === 0 && <li className="py-6 text-center text-pietra">Nessuna prenotazione in arrivo.</li>}
          </ul>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-lava/5">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="max-w-xl">
                  <p className="font-semibold">{e.event_type}{e.date ? ` · ${formatDate(e.date)}` : ""}{e.guests ? ` · ${e.guests} invitati` : ""}</p>
                  <p className="text-sm">{e.name} · <a className="font-semibold underline" href={`tel:${e.phone.replace(/[^+\d]/g, "")}`}>{e.phone}</a>{e.email && <> · <a className="underline" href={`mailto:${e.email}`}>{e.email}</a></>}</p>
                  {e.message && <p className="mt-1 text-sm text-pietra">{e.message}</p>}
                  <p className="mt-1 text-xs text-pietra">Ricevuta {formatDateTime(e.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[e.status]}`}>{LABEL[e.status]}</span>
                  {actions("event_requests", e.id, e.status)}
                </div>
              </li>
            ))}
            {events.length === 0 && <li className="py-6 text-center text-pietra">Nessuna richiesta.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
