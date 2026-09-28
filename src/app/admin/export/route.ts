import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth";
import { loadOrders, resolveRange, toCsv } from "@/lib/report";
import { formatDateTime } from "@/lib/time";

export async function GET(req: Request) {
  const staff = await getStaff();
  if (staff?.role !== "admin") return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  const url = new URL(req.url);
  const type = url.searchParams.get("type");

  if (type === "clienti") {
    const { data } = await staff.sb.from("customers").select("first_name, last_name, phone, email, created_at").eq("marketing_consent", true).order("created_at");
    const csv = toCsv([["Nome", "Cognome", "Telefono", "Email", "Cliente dal"], ...(data ?? []).map((c) => [c.first_name, c.last_name, c.phone, c.email, formatDateTime(c.created_at)])]);
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="clienti-marketing.csv"' } });
  }

  const range = resolveRange(url.searchParams.get("periodo") ?? undefined, url.searchParams.get("dal") ?? undefined, url.searchParams.get("al") ?? undefined);
  const orders = await loadOrders(staff.sb, range);
  const csv = toCsv([
    ["Numero", "Data", "Tipo", "Stato", "Cliente", "Articoli", "Subtotale", "Consegna", "Sconto", "Totale", "Pagamento", "Stato pagamento"],
    ...orders.map((o) => [
      o.number,
      formatDateTime(o.created_at),
      o.type === "delivery" ? "Consegna" : "Asporto",
      o.status,
      o.customer_name,
      o.order_items.map((i) => `${i.quantity}x ${i.name}`).join(", "),
      o.subtotal.toFixed(2).replace(".", ","),
      o.delivery_fee.toFixed(2).replace(".", ","),
      o.discount.toFixed(2).replace(".", ","),
      o.total.toFixed(2).replace(".", ","),
      o.payment_method,
      o.payment_status,
    ]),
  ]);
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="ordini-${range.from}_${range.to}.csv"` },
  });
}
