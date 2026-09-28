import "server-only";
import { Resend } from "resend";
import { formatEuro } from "./pricing";
import { SITE, fullAddress } from "./site";
import { formatDateTime, formatTime } from "./time";
import { PAYMENT_LABELS, statusLabel, TYPE_LABELS } from "./order-status";
import type { OrderWithItems } from "./types";

const FROM = process.env.EMAIL_FROM ?? "RistOro dell'Etna <ordini@ristorodelletna.it>";

function getResend(): Resend | null {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html lang="it"><body style="margin:0;background:#F6F0E6;font-family:Helvetica,Arial,sans-serif;color:#1C1A19">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
  <table width="100%" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden" cellpadding="0" cellspacing="0">
    <tr><td style="background:#1C1A19;padding:20px 24px;color:#D4A24C;font-family:Georgia,serif;font-size:22px">RistOro dell'Etna</td></tr>
    <tr><td style="padding:24px"><h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px">${esc(title)}</h1>${body}</td></tr>
    <tr><td style="padding:16px 24px;background:#F6F0E6;font-size:12px;color:#6b635c">${esc(fullAddress)}</td></tr>
  </table></td></tr></table></body></html>`;
}

function itemsTable(order: OrderWithItems) {
  const rows = order.order_items
    .map((i) => {
      const mods = i.modifiers.map((m) => (m.group === "Senza" ? `senza ${m.name}` : m.name)).join(", ");
      return `<tr><td style="padding:6px 0;vertical-align:top">${i.quantity}× <b>${esc(i.name)}</b>${mods ? `<br><span style="color:#6b635c;font-size:13px">${esc(mods)}</span>` : ""}${i.notes ? `<br><i style="color:#6b635c;font-size:13px">${esc(i.notes)}</i>` : ""}</td><td align="right" style="padding:6px 0;vertical-align:top">${formatEuro(i.unit_price * i.quantity)}</td></tr>`;
    })
    .join("");
  const line = (l: string, v: string, bold = false) =>
    `<tr><td style="padding:3px 0;${bold ? "font-weight:bold;font-size:16px" : "color:#6b635c"}">${l}</td><td align="right" style="padding:3px 0;${bold ? "font-weight:bold;font-size:16px" : ""}">${v}</td></tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-top:1px solid #eee;margin-top:12px">${rows}
    <tr><td colspan="2" style="border-top:1px solid #eee;padding-top:6px"></td></tr>
    ${line("Subtotale", formatEuro(order.subtotal))}
    ${order.type === "delivery" ? line("Consegna", formatEuro(order.delivery_fee)) : ""}
    ${order.discount > 0 ? line(`Sconto ${order.discount_code ?? ""}`, "-" + formatEuro(order.discount)) : ""}
    ${line("Totale", formatEuro(order.total), true)}
  </table>`;
}

function trackingButton(order: OrderWithItems) {
  const url = `${SITE.url}/ordine/${order.id}`;
  return `<p style="margin:20px 0"><a href="${url}" style="background:#C8412B;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;display:inline-block;font-weight:bold">Segui il tuo ordine</a></p>`;
}

export async function sendOrderConfirmation(order: OrderWithItems) {
  const resend = getResend();
  if (!resend || !order.customer_email) return;
  const when = order.asap ? "prima possibile" : formatDateTime(order.scheduled_for);
  const body = `
    <p>Ciao ${esc(order.customer_name.split(" ")[0])}, grazie per il tuo ordine! Lo stiamo verificando e ti confermeremo a breve l'orario.</p>
    <p style="font-size:14px;line-height:1.6">
      <b>Ordine n° ${order.number}</b><br>
      ${TYPE_LABELS[order.type]} · ${esc(when)}<br>
      ${order.type === "delivery" && order.address ? `${esc(order.address.street)} ${esc(order.address.number)}, ${esc(order.address.city)}<br>` : `Ritiro: ${esc(fullAddress)}<br>`}
      Pagamento: ${PAYMENT_LABELS[order.payment_method]}${order.payment_status === "paid" ? " (pagato)" : ""}
    </p>
    ${trackingButton(order)}
    ${itemsTable(order)}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: order.customer_email,
      subject: `Ordine n° ${order.number} ricevuto — RistOro dell'Etna`,
      html: layout("Abbiamo ricevuto il tuo ordine", body),
    });
  } catch (e) {
    console.error("email conferma", e);
  }
}

export async function sendStatusUpdate(order: OrderWithItems) {
  const resend = getResend();
  if (!resend || !order.customer_email) return;
  const label = statusLabel(order.status, order.type);
  let text = "";
  switch (order.status) {
    case "accettato":
      text = `Il tuo ordine è stato accettato. ${order.type === "delivery" ? "Consegna prevista" : "Pronto per il ritiro"} alle <b>${formatTime(order.estimated_ready_at ?? order.scheduled_for)}</b>.`;
      break;
    case "pronto":
      text = "Il tuo ordine è pronto: ti aspettiamo al locale!";
      break;
    case "in_consegna":
      text = "Il nostro rider è partito: il tuo ordine sta arrivando.";
      break;
    case "rifiutato":
    case "annullato":
      text = `Ci dispiace, il tuo ordine è stato ${order.status}.${order.status_reason ? ` Motivo: ${esc(order.status_reason)}.` : ""}`;
      break;
    default:
      return;
  }
  try {
    await resend.emails.send({
      from: FROM,
      to: order.customer_email,
      subject: `Ordine n° ${order.number}: ${label}`,
      html: layout(label, `<p style="font-size:15px;line-height:1.6">${text}</p>${trackingButton(order)}`),
    });
  } catch (e) {
    console.error("email stato", e);
  }
}

/** Notifica opzionale allo staff per nuove prenotazioni/richieste eventi */
export async function notifyStaff(subject: string, lines: Record<string, string | number | null | undefined>) {
  const resend = getResend();
  const to = process.env.STAFF_NOTIFY_EMAIL;
  if (!resend || !to) return;
  const body = Object.entries(lines)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<b>${esc(k)}:</b> ${esc(String(v))}`)
    .join("<br>");
  try {
    await resend.emails.send({ from: FROM, to, subject, html: layout(subject, `<p style="line-height:1.7">${body}</p>`) });
  } catch (e) {
    console.error("email staff", e);
  }
}
