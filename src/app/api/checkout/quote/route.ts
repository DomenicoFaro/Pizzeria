import { NextResponse } from "next/server";
import { computeQuote, OrderError, quoteSchema } from "@/lib/orders";

export async function POST(req: Request) {
  const parsed = quoteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }
  try {
    const q = await computeQuote(parsed.data);
    return NextResponse.json({
      subtotal: q.subtotal,
      deliveryFee: q.deliveryFee,
      discount: q.discount,
      discountLabel: q.discountLabel,
      discountError: q.discountError,
      total: q.total,
      pizzaCount: q.pizzaCount,
      minOrder: q.minOrder,
      missingForMinimum: q.missingForMinimum,
      zone: q.zone ? { name: q.zone.name, description: q.zone.description, fee: q.zone.fee, freeOver: q.zone.free_over } : null,
      lines: q.lines.map((l) => ({ productId: l.product.id, unitPrice: l.unitPrice })),
    });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message, field: e.field }, { status: 422 });
    console.error(e);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
