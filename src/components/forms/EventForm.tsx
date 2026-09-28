"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { submitEventRequest } from "@/app/(site)/actions";
import { Field, FormMessage, inputClass } from "./Field";

const TYPES = ["Compleanno", "Comunione / Cresima", "Battesimo", "Laurea", "Cena aziendale", "Matrimonio / Anniversario", "Altro"];

export function EventForm() {
  const [state, action, pending] = useActionState(submitEventRequest, null);
  const e = state?.errors ?? {};
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field id="event_type" label="Tipo di evento *" error={e.event_type}>
        <select id="event_type" name="event_type" required className={`${inputClass} h-12`} defaultValue="">
          <option value="" disabled>Scegli…</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field id="date" label="Data indicativa" error={e.date}>
        <input id="date" name="date" type="date" className={`${inputClass} h-12`} />
      </Field>
      <Field id="guests" label="Numero di invitati" error={e.guests}>
        <input id="guests" name="guests" type="number" min={1} max={500} className={`${inputClass} h-12`} />
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
      <Field id="message" label="Raccontaci il tuo evento" className="sm:col-span-2">
        <textarea id="message" name="message" rows={4} className={`${inputClass} py-3`} placeholder="Menù pizza, menù brace, torta, allestimento…" />
      </Field>
      <label className="flex gap-3 text-sm sm:col-span-2">
        <input type="checkbox" name="privacy" className="mt-0.5 h-5 w-5 shrink-0 accent-brace" required />
        <span>Ho letto l&apos;<Link href="/privacy" className="underline">informativa privacy</Link> *</span>
      </label>
      {e.privacy && <p className="text-sm text-brace sm:col-span-2">{e.privacy}</p>}
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <button type="submit" disabled={pending} className="flex h-14 items-center justify-center gap-2 rounded-full bg-brace text-lg font-semibold text-white hover:bg-brace-dark disabled:opacity-60 sm:col-span-2">
        {pending && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />} Richiedi preventivo
      </button>
    </form>
  );
}
