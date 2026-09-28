"use server";

import { z } from "zod";
import { notifyStaff } from "@/lib/email";
import type { FormState } from "@/lib/forms";
import { getServiceSupabase } from "@/lib/supabase/server";
import { romeDateKey } from "@/lib/time";

const phone = z.string().trim().regex(/^\+?[\d\s./-]{8,20}$/, "Numero di telefono non valido");
const optionalEmail = z.string().trim().email("Email non valida").max(120).optional().or(z.literal(""));
const consent = z.literal("on", { message: "Devi accettare l'informativa privacy" });

function fail(error: z.ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const i of error.issues) errors[String(i.path[0])] ??= i.message;
  return { ok: false, message: "Controlla i campi evidenziati.", errors };
}

const reservationSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Orario non valido"),
  people: z.coerce.number().int().min(1, "Almeno 1 persona").max(200),
  name: z.string().trim().min(2, "Inserisci il nome").max(80),
  phone,
  email: optionalEmail,
  notes: z.string().trim().max(500).optional(),
  privacy: consent,
});

export async function submitReservation(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = reservationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  if (d.date < romeDateKey(new Date())) return { ok: false, message: "La data è nel passato.", errors: { date: "Scegli una data futura" } };

  const { error } = await getServiceSupabase()
    .from("reservations")
    .insert({ date: d.date, time: d.time, people: d.people, name: d.name, phone: d.phone, email: d.email || null, notes: d.notes || null });
  if (error) {
    console.error(error);
    return { ok: false, message: "Non siamo riusciti a registrare la prenotazione. Riprova o chiamaci." };
  }
  await notifyStaff("Nuova richiesta di prenotazione", { Data: d.date, Ora: d.time, Persone: d.people, Nome: d.name, Telefono: d.phone, Email: d.email, Note: d.notes });
  return { ok: true, message: `Grazie ${d.name.split(" ")[0]}! Abbiamo ricevuto la tua richiesta: ti richiameremo per confermare il tavolo.` };
}

const eventSchema = z.object({
  event_type: z.string().trim().min(2, "Scegli il tipo di evento").max(60),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  guests: z.coerce.number().int().min(1).max(500).optional().or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(2, "Inserisci il nome").max(80),
  phone,
  email: optionalEmail,
  message: z.string().trim().max(2000).optional(),
  privacy: consent,
});

export async function submitEventRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error);
  const d = parsed.data;
  const { error } = await getServiceSupabase()
    .from("event_requests")
    .insert({
      event_type: d.event_type,
      date: d.date || null,
      guests: d.guests ?? null,
      name: d.name,
      phone: d.phone,
      email: d.email || null,
      message: d.message || null,
    });
  if (error) {
    console.error(error);
    return { ok: false, message: "Non siamo riusciti a inviare la richiesta. Riprova o chiamaci." };
  }
  await notifyStaff("Nuova richiesta evento", { Tipo: d.event_type, Data: d.date, Invitati: d.guests, Nome: d.name, Telefono: d.phone, Email: d.email, Messaggio: d.message });
  return { ok: true, message: "Richiesta inviata! Ti contatteremo a breve per costruire insieme il tuo evento." };
}
