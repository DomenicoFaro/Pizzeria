"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { submitReservation } from "@/app/(site)/actions";
import { useSiteInfo } from "@/components/site/SiteInfo";
import { dayRanges } from "@/lib/schedule";
import { minutesToTime, romeDateKey } from "@/lib/time";
import { Field, FormMessage, inputClass } from "./Field";

export function ReservationForm() {
  const [state, action, pending] = useActionState(submitReservation, null);
  const { hours, closures } = useSiteInfo();
  const today = useMemo(() => romeDateKey(new Date()), []);
  const e = state?.errors ?? {};

  if (state?.ok) return <FormMessage state={state} />;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field id="date" label="Data *" error={e.date}>
        <input id="date" name="date" type="date" min={today} required className={`${inputClass} h-12`} aria-invalid={!!e.date} />
      </Field>
      <Field id="time" label="Ora *" error={e.time}>
        <TimeSelect />
      </Field>
      <Field id="people" label="Persone *" error={e.people}>
        <input id="people" name="people" type="number" min={1} max={200} defaultValue={2} required className={`${inputClass} h-12`} aria-invalid={!!e.people} />
      </Field>
      <Field id="name" label="Nome e cognome *" error={e.name}>
        <input id="name" name="name" autoComplete="name" required className={`${inputClass} h-12`} aria-invalid={!!e.name} />
      </Field>
      <Field id="phone" label="Telefono *" error={e.phone}>
        <input id="phone" name="phone" type="tel" autoComplete="tel" required className={`${inputClass} h-12`} aria-invalid={!!e.phone} />
      </Field>
      <Field id="email" label="Email" error={e.email}>
        <input id="email" name="email" type="email" autoComplete="email" className={`${inputClass} h-12`} aria-invalid={!!e.email} />
      </Field>
      <Field id="notes" label="Note (seggiolone, esterno, allergie…)" className="sm:col-span-2">
        <textarea id="notes" name="notes" rows={3} className={`${inputClass} py-3`} />
      </Field>
      <label className="flex gap-3 text-sm sm:col-span-2">
        <input type="checkbox" name="privacy" className="mt-0.5 h-5 w-5 shrink-0 accent-brace" required />
        <span>Ho letto l&apos;<Link href="/privacy" className="underline">informativa privacy</Link> *</span>
      </label>
      {e.privacy && <p className="text-sm text-brace sm:col-span-2">{e.privacy}</p>}
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <button type="submit" disabled={pending} className="flex h-14 items-center justify-center gap-2 rounded-full bg-brace text-lg font-semibold text-white hover:bg-brace-dark disabled:opacity-60 sm:col-span-2">
        {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />} Invia richiesta
      </button>
      <p className="text-xs text-pietra sm:col-span-2">
        La prenotazione è confermata solo dopo la nostra chiamata o messaggio. Siamo chiusi il martedì. Orari disponibili: {describeHours(hours, closures, today)}.
      </p>
    </form>
  );
}

function TimeSelect() {
  const options: string[] = [];
  for (let m = 12 * 60 + 30; m <= 14 * 60 + 30; m += 15) options.push(minutesToTime(m));
  for (let m = 19 * 60 + 30; m <= 23 * 60; m += 15) options.push(minutesToTime(m));
  return (
    <select id="time" name="time" required defaultValue="20:30" className={`${inputClass} h-12`}>
      {options.map((o) => (
        <option key={o} value={o}>{o}{o < "15:00" ? " (solo domenica)" : ""}</option>
      ))}
    </select>
  );
}

function describeHours(hours: Parameters<typeof dayRanges>[1], closures: Parameters<typeof dayRanges>[2], today: string) {
  const r = dayRanges(today, hours, closures);
  return r.length ? `oggi ${r.map((x) => `${minutesToTime(x.open)}–${minutesToTime(x.close)}`).join(", ")}` : "vedi orari in basso";
}
