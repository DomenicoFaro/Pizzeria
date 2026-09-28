import { NextResponse } from "next/server";
import { getSlotPlan } from "@/lib/orders";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "delivery" ? "delivery" : "pickup";
  const pizzas = Math.max(0, Math.min(100, Number(url.searchParams.get("pizzas")) || 0));
  try {
    const plan = await getSlotPlan(type, pizzas);
    return NextResponse.json(plan, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Errore nel calcolo degli orari" }, { status: 500 });
  }
}
