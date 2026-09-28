import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/PrintButton";
import { requireStaffPage } from "@/lib/auth";
import { normalizeOrder } from "@/lib/orders";
import { PAYMENT_LABELS } from "@/lib/order-status";
import { formatEuro } from "@/lib/pricing";
import { formatDateTime, formatTime } from "@/lib/time";
import type { OrderWithItems } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Comanda per stampante termica 80 mm (cucina + rider) */
export default async function PrintPage({ params }: PageProps<"/admin/stampa/[id]">) {
  const { id } = await params;
  const { sb } = await requireStaffPage();
  const { data } = await sb.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const o = normalizeOrder(data as OrderWithItems);
  const a = o.address;
  const time = o.estimated_ready_at ?? o.scheduled_for;

  return (
    <div className="bg-white">
      <div className="no-print flex gap-2 p-3">
        <PrintButton />
      </div>
      <div className="mx-auto w-[72mm] p-[3mm] font-mono text-[12px] leading-snug text-black">
        <p className="text-center text-[14px] font-bold">RISTORO DELL&apos;ETNA</p>
        <p className="text-center">{o.type === "delivery" ? "*** CONSEGNA ***" : "*** ASPORTO ***"}</p>
        <p className="mt-1 text-center text-[22px] font-bold">N° {o.number}</p>
        <p className="text-center text-[16px] font-bold">ORE {formatTime(time)}</p>
        <p className="text-center">{o.asap ? "prima possibile" : `programmato ${formatDateTime(o.scheduled_for)}`}</p>
        <hr className="my-2 border-dashed border-black" />
        {o.order_items.map((i) => (
          <div key={i.id} className="mb-1.5">
            <p className="flex justify-between font-bold text-[14px]">
              <span>{i.quantity} x {i.name}</span>
            </p>
            {i.modifiers.map((m, idx) => (
              <p key={idx} className={m.group === "Senza" ? "pl-3 font-bold" : "pl-3"}>
                {m.group === "Senza" ? `- SENZA ${m.name.toUpperCase()}` : `+ ${m.name}`}
              </p>
            ))}
            {i.notes && <p className="pl-3 font-bold">&gt;&gt; {i.notes}</p>}
          </div>
        ))}
        {o.notes && (
          <>
            <hr className="my-2 border-dashed border-black" />
            <p className="font-bold">NOTE: {o.notes}</p>
          </>
        )}
        <hr className="my-2 border-dashed border-black" />
        <p className="font-bold">{o.customer_name}</p>
        <p>Tel. {o.customer_phone}</p>
        {a && (
          <>
            <p className="font-bold">{a.street} {a.number}</p>
            <p>{a.cap} {a.city}</p>
            {a.intercom && <p>Citofono: {a.intercom}</p>}
            {a.floor && <p>{a.floor}</p>}
            {a.notes && <p>Note rider: {a.notes}</p>}
          </>
        )}
        <hr className="my-2 border-dashed border-black" />
        <p className="flex justify-between"><span>Subtotale</span><span>{formatEuro(o.subtotal)}</span></p>
        {o.type === "delivery" && <p className="flex justify-between"><span>Consegna</span><span>{formatEuro(o.delivery_fee)}</span></p>}
        {o.discount > 0 && <p className="flex justify-between"><span>Sconto</span><span>-{formatEuro(o.discount)}</span></p>}
        <p className="flex justify-between text-[15px] font-bold"><span>TOTALE</span><span>{formatEuro(o.total)}</span></p>
        <p className="mt-1 font-bold">
          {PAYMENT_LABELS[o.payment_method].toUpperCase()} · {o.payment_status === "paid" ? "PAGATO" : "DA INCASSARE"}
        </p>
        {o.change_for && <p className="font-bold">RESTO DA {formatEuro(o.change_for)}</p>}
        <p className="mt-2 text-center text-[10px]">Ricevuto {formatDateTime(o.created_at)}</p>
        <p className="text-center text-[10px]">Documento non fiscale</p>
      </div>
    </div>
  );
}
