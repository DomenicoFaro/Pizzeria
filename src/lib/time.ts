// Tutti gli orari del locale sono in Europe/Rome, mentre il server (Vercel) gira in UTC.
export const TZ = "Europe/Rome";

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Componenti di data/ora locali (Roma) di un istante */
export function romeParts(date: Date): Parts {
  const p: Record<string, string> = {};
  for (const { type, value } of partsFmt.formatToParts(date)) p[type] = value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: WEEKDAYS[p.weekday],
  };
}

/** "YYYY-MM-DD" della data locale di Roma */
export function romeDateKey(date: Date): string {
  const p = romeParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Converte una data locale di Roma (YYYY-MM-DD) + minuti dalla mezzanotte in un istante UTC */
export function romeToDate(dateKey: string, minutes: number): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  // prima stima: tratto l'orario come UTC, poi correggo per l'offset di Roma in quell'istante
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  const offset = romeOffsetMinutes(new Date(guess));
  let result = guess - offset * 60_000;
  // ricontrollo vicino ai cambi d'ora
  const offset2 = romeOffsetMinutes(new Date(result));
  if (offset2 !== offset) result = guess - offset2 * 60_000;
  return new Date(result);
}

/** Offset di Roma rispetto a UTC in minuti (60 in inverno, 120 in estate) */
export function romeOffsetMinutes(date: Date): number {
  const p = romeParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000);
}

/** Aggiunge giorni a una data "YYYY-MM-DD" */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Giorno della settimana (0 = domenica) di una data "YYYY-MM-DD" */
export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "19:30" o "19:30:00" -> minuti. "00:00" come orario di chiusura = 24:00 */
export function timeToMinutes(t: string, isClose = false): number {
  const [h, m] = t.split(":").map(Number);
  const mins = h * 60 + m;
  return isClose && mins === 0 ? 24 * 60 : mins;
}

export function minutesToTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export const WEEKDAY_NAMES = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
export const WEEKDAY_LABELS = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Etichetta relativa: "oggi", "domani" o "mercoledì 3 ottobre" */
export function relativeDayLabel(dateKey: string, now = new Date()): string {
  const today = romeDateKey(now);
  if (dateKey === today) return "oggi";
  if (dateKey === addDays(today, 1)) return "domani";
  return formatDate(dateKey);
}
