import { NextResponse } from "next/server";
import { getOrderWithItems } from "@/lib/orders";
import { toPublicOrder } from "@/lib/public-order";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Dettaglio ordine per la pagina di tracciamento (l'UUID fa da chiave d'accesso) */
export async function GET(_req: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
  const order = await getOrderWithItems(id);
  if (!order) return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
  return NextResponse.json(toPublicOrder(order), { headers: { "Cache-Control": "no-store" } });
}
