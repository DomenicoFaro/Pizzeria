import { NextResponse } from "next/server";
import { createOrder, OrderError, orderSchema } from "@/lib/orders";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue?.message ?? "Dati non validi", field: issue?.path.join(".") }, { status: 400 });
  }
  try {
    const sb = await getServerSupabase();
    const { data } = await sb.auth.getUser();
    const result = await createOrder(parsed.data, data.user?.id ?? null);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ error: e.message, field: e.field }, { status: 422 });
    console.error(e);
    return NextResponse.json({ error: "Errore del server. Riprova o chiamaci." }, { status: 500 });
  }
}
