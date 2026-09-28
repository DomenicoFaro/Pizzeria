import type { OrderStatus, OrderType, PaymentMethod } from "./types";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  in_attesa_pagamento: "In attesa di pagamento",
  nuovo: "Ricevuto",
  accettato: "Accettato",
  in_preparazione: "In preparazione",
  pronto: "Pronto per il ritiro",
  in_consegna: "In consegna",
  completato: "Completato",
  rifiutato: "Rifiutato",
  annullato: "Annullato",
};

export function statusLabel(status: OrderStatus, type: OrderType): string {
  if (status === "completato") return type === "delivery" ? "Consegnato" : "Ritirato";
  return STATUS_LABELS[status];
}

/** Passi mostrati nella barra di avanzamento del tracciamento */
export function trackingSteps(type: OrderType): OrderStatus[] {
  return type === "delivery"
    ? ["nuovo", "accettato", "in_preparazione", "in_consegna", "completato"]
    : ["nuovo", "accettato", "in_preparazione", "pronto", "completato"];
}

/** Transizioni consentite dal pannello staff */
export const NEXT_STATUS: Partial<Record<OrderStatus, (type: OrderType) => OrderStatus>> = {
  accettato: () => "in_preparazione",
  in_preparazione: (t) => (t === "delivery" ? "in_consegna" : "pronto"),
  pronto: () => "completato",
  in_consegna: () => "completato",
};

export const ACTIVE_STATUSES: OrderStatus[] = ["nuovo", "accettato", "in_preparazione", "pronto", "in_consegna"];
export const FINAL_STATUSES: OrderStatus[] = ["completato", "rifiutato", "annullato"];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Contanti",
  pos: "POS (carta)",
};

export const TYPE_LABELS: Record<OrderType, string> = {
  pickup: "Asporto",
  delivery: "Consegna",
};
