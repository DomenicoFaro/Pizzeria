import type { Metadata } from "next";
import { Card } from "@/components/admin/ui";
import { requireStaffPage } from "@/lib/auth";
import { formatEuro } from "@/lib/pricing";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Clienti" };

type Row = { id: string; first_name: string | null; last_name: string | null; phone: string | null; email: string | null; marketing_consent: boolean; orders: { total: number; status: string; created_at: string }[] };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/clienti">) {
  const { sb } = await requireStaffPage(true);
  const sp = await searchParams;
  const onlyMarketing = sp.marketing === "1";
  let q = sb.from("customers").select("id, first_name, last_name, phone, email, marketing_consent, orders(total, status, created_at)").order("created_at", { ascending: false }).limit(500);
  if (onlyMarketing) q = q.eq("marketing_consent", true);
  const { data } = await q;
  const rows = ((data ?? []) as Row[])
    .map((c) => {
      const valid = c.orders.filter((o) => !["rifiutato", "annullato", "in_attesa_pagamento"].includes(o.status));
      return { ...c, count: valid.length, spent: valid.reduce((s, o) => s + Number(o.total), 0), last: valid.map((o) => o.created_at).sort().at(-1) };
    })
    .sort((a, b) => b.spent - a.spent);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-serif text-3xl font-bold">Clienti</h1>
        <a href={onlyMarketing ? "/admin/clienti" : "/admin/clienti?marketing=1"} className="flex h-11 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-lava/15">
          {onlyMarketing ? "Mostra tutti" : "Solo con consenso marketing"}
        </a>
        <a href="/admin/export?type=clienti" className="flex h-11 items-center rounded-full bg-lava px-4 text-sm font-semibold text-crema">Esporta CSV (consenso marketing)</a>
      </div>
      <p className="text-sm text-pietra">Usa i contatti per comunicazioni promozionali solo per i clienti con consenso marketing.</p>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-pietra">
              <tr><th className="py-2">Cliente</th><th>Telefono</th><th>Email</th><th className="text-right">Ordini</th><th className="text-right">Spesa</th><th>Ultimo</th><th>Mkt</th></tr>
            </thead>
            <tbody className="divide-y divide-lava/5">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="py-2 font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td><a href={`tel:${(c.phone ?? "").replace(/[^+\d]/g, "")}`} className="underline">{c.phone}</a></td>
                  <td>{c.email ?? "—"}</td>
                  <td className="text-right tabular-nums">{c.count}</td>
                  <td className="text-right tabular-nums">{formatEuro(c.spent)}</td>
                  <td>{c.last ? formatDateTime(c.last) : "—"}</td>
                  <td>{c.marketing_consent ? "✓" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
