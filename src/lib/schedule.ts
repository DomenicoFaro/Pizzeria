import type { Closure, OpeningHour, OrderType, Settings } from "./types";
import {
  addDays,
  formatTime,
  minutesToTime,
  relativeDayLabel,
  romeDateKey,
  romeParts,
  romeToDate,
  timeToMinutes,
  WEEKDAY_NAMES,
  weekdayOf,
} from "./time";

export type Range = { open: number; close: number }; // minuti dalla mezzanotte del giorno

type ScheduleSettings = Pick<
  Settings,
  "prep_time_pickup" | "prep_time_delivery" | "slot_minutes" | "slot_capacity" | "days_ahead" | "orders_paused"
>;

export function isClosedOn(dateKey: string, closures: Closure[]): Closure | undefined {
  return closures.find((c) => c.date_from <= dateKey && dateKey <= c.date_to);
}

/** Fasce di apertura di una data locale (i range dopo la mezzanotte hanno close > 1440) */
export function dayRanges(dateKey: string, hours: OpeningHour[], closures: Closure[]): Range[] {
  if (isClosedOn(dateKey, closures)) return [];
  const wd = weekdayOf(dateKey);
  return hours
    .filter((h) => h.weekday === wd)
    .map((h) => {
      const open = timeToMinutes(h.open_time);
      let close = timeToMinutes(h.close_time, true);
      if (close <= open) close += 1440;
      return { open, close };
    })
    .sort((a, b) => a.open - b.open);
}

export type OpenStatus = {
  isOpen: boolean;
  /** fine della fascia corrente */
  closesAt: Date | null;
  /** prossima apertura (se chiuso) */
  nextOpen: Date | null;
  label: string;
};

export function getOpenStatus(now: Date, hours: OpeningHour[], closures: Closure[]): OpenStatus {
  const today = romeDateKey(now);
  const p = romeParts(now);
  const nowMin = p.hour * 60 + p.minute;

  // fasce di oggi + fasce di ieri che sforano oltre la mezzanotte
  const candidates: { dateKey: string; r: Range; shift: number }[] = [
    ...dayRanges(addDays(today, -1), hours, closures).map((r) => ({ dateKey: addDays(today, -1), r, shift: -1440 })),
    ...dayRanges(today, hours, closures).map((r) => ({ dateKey: today, r, shift: 0 })),
  ];
  for (const c of candidates) {
    const open = c.r.open + c.shift;
    const close = c.r.close + c.shift;
    if (nowMin >= open && nowMin < close) {
      const closesAt = romeToDate(c.dateKey, c.r.close);
      return { isOpen: true, closesAt, nextOpen: null, label: `Aperto ora · fino alle ${formatTime(closesAt)}` };
    }
  }

  // prossima apertura nei prossimi 14 giorni
  for (let i = 0; i < 14; i++) {
    const dk = addDays(today, i);
    for (const r of dayRanges(dk, hours, closures)) {
      if (i === 0 && r.open <= nowMin) continue;
      const nextOpen = romeToDate(dk, r.open);
      const when = i === 0 ? "oggi" : i === 1 ? "domani" : WEEKDAY_NAMES[weekdayOf(dk)];
      return { isOpen: false, closesAt: null, nextOpen, label: `Chiuso · riapriamo ${when} alle ${minutesToTime(r.open)}` };
    }
  }
  return { isOpen: false, closesAt: null, nextOpen: null, label: "Chiuso" };
}

export type Slot = { iso: string; label: string; available: boolean; load: number };
export type SlotDay = { dateKey: string; label: string; slots: Slot[] };

export type SlotPlan = {
  paused: boolean;
  isOpen: boolean;
  /** "prima possibile" disponibile solo se il locale è aperto ora */
  asap: Slot | null;
  days: SlotDay[];
  status: OpenStatus;
};

/**
 * Calcola gli slot ordinabili.
 * @param load   pizze già prenotate per slot (chiave = ISO dello slot)
 * @param pizzas pizze nel carrello corrente
 */
export function buildSlotPlan(opts: {
  now: Date;
  type: OrderType;
  hours: OpeningHour[];
  closures: Closure[];
  settings: ScheduleSettings;
  load: Record<string, number>;
  pizzas: number;
}): SlotPlan {
  const { now, type, hours, closures, settings, load, pizzas } = opts;
  const status = getOpenStatus(now, hours, closures);
  if (settings.orders_paused) return { paused: true, isOpen: status.isOpen, asap: null, days: [], status };

  const step = Math.max(5, settings.slot_minutes || 15);
  const prep = type === "delivery" ? settings.prep_time_delivery : settings.prep_time_pickup;
  const earliest = now.getTime() + prep * 60_000;
  const today = romeDateKey(now);
  const days: SlotDay[] = [];

  const slotAvailable = (l: number) => pizzas === 0 || l === 0 || l + pizzas <= settings.slot_capacity;

  // includo ieri per le fasce che sforano oltre la mezzanotte
  for (let i = -1; i <= Math.max(0, settings.days_ahead); i++) {
    const dk = addDays(today, i);
    const slots: Slot[] = [];
    for (const r of dayRanges(dk, hours, closures)) {
      const first = Math.ceil((r.open + prep) / step) * step;
      for (let m = first; m <= r.close - step; m += step) {
        const d = romeToDate(dk, m);
        if (d.getTime() < earliest) continue;
        const iso = d.toISOString();
        const l = load[iso] ?? 0;
        slots.push({ iso, label: formatTime(d), available: slotAvailable(l), load: l });
      }
    }
    if (slots.length) {
      // gli slot dopo la mezzanotte appartengono comunque al "turno" della sera prima
      days.push({ dateKey: dk, label: relativeDayLabel(dk, now), slots });
    }
  }

  let asap: Slot | null = null;
  if (status.isOpen && status.closesAt) {
    const closeMs = status.closesAt.getTime();
    for (const day of days) {
      asap = day.slots.find((s) => s.available && new Date(s.iso).getTime() <= closeMs) ?? null;
      if (asap) break;
    }
  }

  return { paused: false, isOpen: status.isOpen, asap, days, status };
}

/** Verifica lato server che uno slot scelto sia valido */
export function isValidSlot(plan: SlotPlan, iso: string): boolean {
  return plan.days.some((d) => d.slots.some((s) => s.iso === iso && s.available));
}
