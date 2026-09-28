"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addClosure, deleteClosure, deleteZone, saveHours, saveSettings, saveZone } from "@/app/admin/actions";
import { WEEKDAY_LABELS, formatDate } from "@/lib/time";
import type { Closure, DeliveryZone, OpeningHour, Settings } from "@/lib/types";
import { adminInput, Card, PrimaryButton, SecondaryButton, Toggle } from "./ui";

type Result = { ok: boolean; error?: string };
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function SettingsAdmin({ settings, hours, closures, zones }: { settings: Settings; hours: OpeningHour[]; closures: Closure[]; zones: DeliveryZone[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const exec = (fn: () => Promise<Result>, okText = "Salvato ✓") => {
    setMsg(null);
    startTransition(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Errore" });
      if (r.ok) router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <h1 className="font-serif text-3xl font-bold">Impostazioni</h1>
      {msg && (
        <p className={`sticky top-2 z-20 rounded-2xl p-3 text-sm font-semibold shadow ${msg.ok ? "bg-basilico text-white" : "bg-brace text-white"}`} role="status">
          {msg.text}
        </p>
      )}
      <GeneralSettings settings={settings} pending={pending} onSave={(s) => exec(() => saveSettings(s))} />
      <HoursEditor hours={hours} pending={pending} onSave={(h) => exec(() => saveHours(h))} />
      <ClosuresEditor closures={closures} onAdd={(c) => exec(() => addClosure(c))} onDelete={(id) => exec(() => deleteClosure(id), "Chiusura rimossa")} />
      <ZonesEditor zones={zones} onSave={(z) => exec(() => saveZone(z))} onDelete={(id) => exec(() => deleteZone(id), "Zona eliminata")} />
    </div>
  );
}

function num(v: string) {
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

function GeneralSettings({ settings, pending, onSave }: { settings: Settings; pending: boolean; onSave: (s: Parameters<typeof saveSettings>[0]) => void }) {
  const [s, setS] = useState(settings);
  const text = (k: keyof Settings, label: string, placeholder?: string) => (
    <label className="text-sm font-medium">
      {label}
      <input className={`${adminInput} mt-1`} value={(s[k] as string | null) ?? ""} placeholder={placeholder} onChange={(e) => setS({ ...s, [k]: e.target.value })} />
    </label>
  );
  const number = (k: keyof Settings, label: string) => (
    <label className="text-sm font-medium">
      {label}
      <input inputMode="numeric" className={`${adminInput} mt-1`} value={String(s[k] ?? "")} onChange={(e) => setS({ ...s, [k]: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
    </label>
  );
  const save = () => {
    const { prep_time_pickup, prep_time_delivery, slot_minutes, slot_capacity, days_ahead, pause_message, pay_cash, pay_pos, pickup_enabled, delivery_enabled, phone, phone_landline, whatsapp, email, announcement } = s;
    onSave({ prep_time_pickup, prep_time_delivery, slot_minutes, slot_capacity, days_ahead, pause_message, pay_cash, pay_pos, pickup_enabled, delivery_enabled, phone, phone_landline, whatsapp, email, announcement });
  };
  return (
    <>
      <Card title="Ordini online">
        <div className="grid gap-3 sm:grid-cols-3">
          {number("prep_time_pickup", "Preparazione asporto (min)")}
          {number("prep_time_delivery", "Preparazione consegna (min)")}
          {number("slot_minutes", "Durata slot (min)")}
          {number("slot_capacity", "Max pizze per slot")}
          {number("days_ahead", "Giorni prenotabili in anticipo")}
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6">
          <Toggle checked={s.pickup_enabled} onChange={(v) => setS({ ...s, pickup_enabled: v })} label="Asporto attivo" />
          <Toggle checked={s.delivery_enabled} onChange={(v) => setS({ ...s, delivery_enabled: v })} label="Consegna attiva" />
        </div>
        <p className="mt-4 text-sm font-medium">Metodi di pagamento</p>
        <div className="flex flex-wrap gap-x-6">
          <Toggle checked={s.pay_cash} onChange={(v) => setS({ ...s, pay_cash: v })} label="Contanti" />
          <Toggle checked={s.pay_pos} onChange={(v) => setS({ ...s, pay_pos: v })} label="POS alla consegna/ritiro" />
        </div>
        <div className="mt-4 grid gap-3">
          {text("pause_message", "Messaggio quando gli ordini sono sospesi")}
          {text("announcement", "Avviso in cima al sito (vuoto = nessuno)", "Es. Chiusi per ferie dal 10 al 20 gennaio")}
        </div>
      </Card>
      <Card title="Dati del locale">
        <div className="grid gap-3 sm:grid-cols-2">
          {text("phone", "Telefono principale")}
          {text("phone_landline", "Telefono fisso")}
          {text("whatsapp", "WhatsApp (solo numeri, con prefisso 39)")}
          {text("email", "Email")}
        </div>
      </Card>
      <PrimaryButton disabled={pending} onClick={save} className="w-full sm:w-auto">Salva impostazioni</PrimaryButton>
    </>
  );
}

function HoursEditor({ hours, pending, onSave }: { hours: OpeningHour[]; pending: boolean; onSave: (h: OpeningHour[]) => void }) {
  const [list, setList] = useState(hours.map((h) => ({ weekday: h.weekday, open_time: h.open_time.slice(0, 5), close_time: h.close_time.slice(0, 5) })));
  return (
    <Card title="Orari settimanali" actions={<PrimaryButton disabled={pending} onClick={() => onSave(list)}>Salva orari</PrimaryButton>}>
      <p className="mb-3 text-sm text-pietra">Chiusura alle 00:00 = mezzanotte. Un giorno senza fasce è giorno di chiusura.</p>
      <ul className="space-y-2">
        {ORDER.map((wd) => {
          const ranges = list.map((r, i) => ({ ...r, i })).filter((r) => r.weekday === wd);
          return (
            <li key={wd} className="flex flex-wrap items-center gap-2 rounded-2xl bg-crema p-2">
              <span className="w-24 font-semibold">{WEEKDAY_LABELS[wd]}</span>
              {ranges.length === 0 && <span className="text-sm text-brace">Chiuso</span>}
              {ranges.map((r) => (
                <span key={r.i} className="flex items-center gap-1 rounded-xl bg-white p-1 ring-1 ring-lava/10">
                  <input type="time" aria-label="Apertura" className="h-9 rounded-lg px-1" value={r.open_time} onChange={(e) => setList((l) => l.map((x, i) => (i === r.i ? { ...x, open_time: e.target.value } : x)))} />
                  –
                  <input type="time" aria-label="Chiusura" className="h-9 rounded-lg px-1" value={r.close_time} onChange={(e) => setList((l) => l.map((x, i) => (i === r.i ? { ...x, close_time: e.target.value } : x)))} />
                  <button type="button" onClick={() => setList((l) => l.filter((_, i) => i !== r.i))} className="flex h-9 w-9 items-center justify-center text-brace" aria-label="Rimuovi fascia"><Trash2 className="h-4 w-4" /></button>
                </span>
              ))}
              <button type="button" onClick={() => setList((l) => [...l, { weekday: wd, open_time: "19:30", close_time: "00:00" }])} className="flex h-9 items-center gap-1 rounded-full px-3 text-sm ring-1 ring-lava/15">
                <Plus className="h-3.5 w-3.5" /> Fascia
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ClosuresEditor({ closures, onAdd, onDelete }: { closures: Closure[]; onAdd: (c: { date_from: string; date_to: string; reason: string }) => void; onDelete: (id: string) => void }) {
  const [c, setC] = useState({ date_from: "", date_to: "", reason: "" });
  return (
    <Card title="Chiusure straordinarie e ferie">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
        <label className="text-sm font-medium">Dal<input type="date" className={`${adminInput} mt-1`} value={c.date_from} onChange={(e) => setC({ ...c, date_from: e.target.value, date_to: c.date_to || e.target.value })} /></label>
        <label className="text-sm font-medium">Al<input type="date" className={`${adminInput} mt-1`} value={c.date_to} onChange={(e) => setC({ ...c, date_to: e.target.value })} /></label>
        <label className="text-sm font-medium">Motivo<input className={`${adminInput} mt-1`} value={c.reason} onChange={(e) => setC({ ...c, reason: e.target.value })} placeholder="Ferie" /></label>
        <PrimaryButton className="self-end" disabled={!c.date_from} onClick={() => { onAdd(c); setC({ date_from: "", date_to: "", reason: "" }); }}>Aggiungi</PrimaryButton>
      </div>
      <ul className="mt-4 divide-y divide-lava/5">
        {closures.map((x) => (
          <li key={x.id} className="flex items-center justify-between py-2">
            <span>{formatDate(x.date_from)}{x.date_to !== x.date_from ? ` → ${formatDate(x.date_to)}` : ""} {x.reason && <span className="text-pietra">· {x.reason}</span>}</span>
            <button type="button" onClick={() => onDelete(x.id!)} className="flex h-10 w-10 items-center justify-center text-brace" aria-label="Elimina chiusura"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
        {closures.length === 0 && <li className="py-2 text-sm text-pietra">Nessuna chiusura programmata.</li>}
      </ul>
    </Card>
  );
}

function ZonesEditor({ zones, onSave, onDelete }: { zones: DeliveryZone[]; onSave: (z: Parameters<typeof saveZone>[0]) => void; onDelete: (id: string) => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card title="Zone di consegna" actions={<SecondaryButton onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Zona</SecondaryButton>}>
      <p className="mb-3 text-sm text-pietra">
        Le zone sono controllate in ordine: la prima che contiene l&apos;indirizzo vince. Usa il raggio in km dal locale oppure incolla un poligono GeoJSON (coordinate [lng, lat]) disegnato ad es. su geojson.io.
      </p>
      <div className="space-y-3">
        {zones.map((z) => <ZoneRow key={z.id} zone={z} onSave={onSave} onDelete={onDelete} />)}
        {adding && <ZoneRow zone={null} position={zones.length + 1} onSave={(z) => { onSave(z); setAdding(false); }} onDelete={() => setAdding(false)} />}
      </div>
    </Card>
  );
}

function ZoneRow({ zone, position, onSave, onDelete }: { zone: DeliveryZone | null; position?: number; onSave: (z: Parameters<typeof saveZone>[0]) => void; onDelete: (id: string) => void }) {
  const [f, setF] = useState({
    name: zone?.name ?? "",
    description: zone?.description ?? "",
    radius_km: zone?.radius_km != null ? String(zone.radius_km) : "",
    polygon: zone?.polygon ? JSON.stringify(zone.polygon) : "",
    fee: String(zone?.fee ?? "0"),
    min_order: String(zone?.min_order ?? "0"),
    free_over: zone?.free_over != null ? String(zone.free_over) : "",
    is_active: zone?.is_active ?? true,
    position: String(zone?.position ?? position ?? 1),
  });
  const [err, setErr] = useState<string | null>(null);
  const save = () => {
    let polygon: [number, number][] | null = null;
    if (f.polygon.trim()) {
      try {
        const parsed = JSON.parse(f.polygon);
        // accetto sia un array di coordinate sia un Feature/Polygon GeoJSON
        polygon = parsed?.geometry?.coordinates?.[0] ?? parsed?.coordinates?.[0] ?? parsed;
      } catch {
        return setErr("Poligono non valido (JSON)");
      }
    }
    setErr(null);
    onSave({
      id: zone?.id,
      name: f.name,
      description: f.description || null,
      radius_km: f.radius_km ? num(f.radius_km) : null,
      polygon,
      fee: num(f.fee),
      min_order: num(f.min_order),
      free_over: f.free_over ? num(f.free_over) : null,
      is_active: f.is_active,
      position: Number(f.position) || 1,
    });
  };
  const field = (k: keyof typeof f, label: string, cls = "") => (
    <label className={`text-sm font-medium ${cls}`}>
      {label}
      <input className={`${adminInput} mt-1`} value={String(f[k])} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  return (
    <div className="rounded-2xl bg-crema p-3">
      <div className="grid gap-2 sm:grid-cols-4">
        {field("name", "Nome")}
        {field("description", "Comuni", "sm:col-span-3")}
        {field("radius_km", "Raggio km")}
        {field("fee", "Costo €")}
        {field("min_order", "Ordine minimo €")}
        {field("free_over", "Gratis da € (facolt.)")}
        {field("polygon", "Poligono GeoJSON (facoltativo, sostituisce il raggio)", "sm:col-span-3")}
        {field("position", "Ordine")}
      </div>
      {err && <p className="mt-2 text-sm text-brace">{err}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Toggle checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} label="Attiva" />
        <span className="flex-1" />
        <SecondaryButton className="text-brace" onClick={() => (zone ? confirm(`Eliminare ${zone.name}?`) && onDelete(zone.id) : onDelete(""))}>
          <Trash2 className="h-4 w-4" /> {zone ? "Elimina" : "Annulla"}
        </SecondaryButton>
        <PrimaryButton disabled={!f.name.trim()} onClick={save}>Salva zona</PrimaryButton>
      </div>
    </div>
  );
}
