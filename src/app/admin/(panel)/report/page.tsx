import type { Metadata } from "next";
import { Card } from "@/components/admin/ui";
import { requireStaffPage } from "@/lib/auth";
import { PAYMENT_LABELS } from "@/lib/order-status";
import { formatEuro } from "@/lib/pricing";
import { loadOrders, resolveRange, summarize } from "@/lib/report";
import { formatDate } from "@/lib/time";
import type { PaymentMethod } from "@/lib/types";

export const metadata: Metadata = { title: "Report" };

const PERIODS = [
  ["oggi", "Oggi"],
  ["7g", "Ultimi 7 giorni"],
  ["mese", "Questo mese"],
  ["30g", "Ultimi 30 giorni"],
] as const;

export default async function ReportPage({ searchParams }: PageProps<"/admin/report">) {
  const { sb } = await requireStaffPage(true);
  const sp = await searchParams;
  const range = resolveRange(sp.periodo as string | undefined, sp.dal as string | undefined, sp.al as string | undefined);
  const orders = await loadOrders(sb, range);
  const r = summarize(orders);
  const maxDay = Math.max(1, ...r.byDay.map((d) => d.revenue));
  const exportUrl = `/admin/export?type=ordini&periodo=custom&dal=${range.from}&al=${range.to}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-serif text-3xl font-bold">Report</h1>
        <a href={exportUrl} className="flex h-11 items-center rounded-full bg-lava px-4 text-sm font-semibold text-crema">Esporta CSV</a>
      </div>
      <form className="flex flex-wrap items-end gap-2">
        {PERIODS.map(([k, l]) => (
          <a key={k} href={`?periodo=${k}`} className={`flex h-10 items-center rounded-full px-4 text-sm font-semibold ${range.period === k ? "bg-lava text-crema" : "bg-white ring-1 ring-lava/10"}`}>{l}</a>
        ))}
        <input type="hidden" name="periodo" value="custom" />
        <label className="text-xs">Dal<input type="date" name="dal" defaultValue={range.from} className="ml-1 h-10 rounded-xl bg-white px-2 ring-1 ring-lava/10" /></label>
        <label className="text-xs">Al<input type="date" name="al" defaultValue={range.to} className="ml-1 h-10 rounded-xl bg-white px-2 ring-1 ring-lava/10" /></label>
        <button type="submit" className="h-10 rounded-full px-4 text-sm font-semibold ring-1 ring-lava/15">Applica</button>
      </form>
      <p className="text-sm text-pietra capitalize">{formatDate(range.from)} → {formatDate(range.to)} · esclusi ordini rifiutati/annullati</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Incasso" value={formatEuro(r.revenue)} />
        <Stat label="Ordini" value={String(r.count)} />
        <Stat label="Scontrino medio" value={formatEuro(r.average)} />
        <Stat label="Asporto / Consegna" value={`${r.byType.pickup.count} / ${r.byType.delivery.count}`} sub={`${formatEuro(r.byType.pickup.revenue)} / ${formatEuro(r.byType.delivery.revenue)}`} />
      </div>

      <Card title="Incasso per giorno">
        {r.byDay.length === 0 ? (
          <p className="text-pietra">Nessun ordine nel periodo.</p>
        ) : (
          <ul className="space-y-1.5">
            {r.byDay.map((d) => (
              <li key={d.day} className="grid grid-cols-[110px_1fr_110px] items-center gap-3 text-sm">
                <span className="capitalize">{formatDate(d.day).split(" ").slice(0, 3).join(" ")}</span>
                <span className="h-5 rounded-md bg-brace/80" style={{ width: `${(d.revenue / maxDay) * 100}%` }} aria-hidden="true" />
                <span className="text-right tabular-nums">{formatEuro(d.revenue)} · {d.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Piatti più venduti">
          <ol className="divide-y divide-lava/5 text-sm">
            {r.topProducts.map((p, i) => (
              <li key={p.name} className="flex justify-between py-2">
                <span><span className="mr-2 text-pietra">{i + 1}.</span>{p.name}</span>
                <span className="tabular-nums">{p.qty} · {formatEuro(p.revenue)}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Metodi di pagamento">
          <ul className="divide-y divide-lava/5 text-sm">
            {r.byPayment.map(([m, v]) => (
              <li key={m} className="flex justify-between py-2"><span>{PAYMENT_LABELS[m as PaymentMethod] ?? m}</span><span className="tabular-nums">{formatEuro(v)}</span></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 ring-1 ring-lava/5">
      <p className="text-sm text-pietra">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-pietra">{sub}</p>}
    </div>
  );
}
