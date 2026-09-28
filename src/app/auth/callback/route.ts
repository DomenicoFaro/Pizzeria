import { NextResponse } from "next/server";
import { escapeLike } from "@/lib/orders";
import { getServerSupabase, getServiceSupabase } from "@/lib/supabase/server";

/** Ritorno dal magic link / Google: crea la sessione e collega gli ordini fatti come ospite */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/area-cliente";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/area-cliente";

  if (code) {
    const sb = await getServerSupabase();
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (!error && data.user?.email) {
      await linkGuestOrders(data.user.id, data.user.email).catch((e) => console.error(e));
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/area-cliente?errore=accesso", url.origin));
}

async function linkGuestOrders(userId: string, email: string) {
  const admin = getServiceSupabase();
  const { data: mine } = await admin.from("customers").select("id").eq("auth_user_id", userId).maybeSingle();
  const { data: guests } = await admin
    .from("customers")
    .select("id")
    .ilike("email", escapeLike(email.toLowerCase()))
    .is("auth_user_id", null)
    .order("created_at");
  if (!guests?.length) return;
  let target = mine?.id as string | undefined;
  if (!target) {
    target = guests[0].id as string;
    await admin.from("customers").update({ auth_user_id: userId }).eq("id", target);
  }
  const others = guests.map((g) => g.id as string).filter((id) => id !== target);
  if (others.length) await admin.from("orders").update({ customer_id: target }).in("customer_id", others);
}
