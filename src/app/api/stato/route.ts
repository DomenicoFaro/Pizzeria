import { NextResponse } from "next/server";
import { cleanEnv, SITE } from "@/lib/site";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { getPublicSupabase, getServiceSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Stato di una variabile senza mai mostrarne il valore */
function describe(value: string | undefined) {
  if (value === undefined) return "mancante";
  const v = cleanEnv(value);
  if (!v) return "presente ma VUOTA";
  const kind = v.startsWith("sb_publishable_")
    ? "chiave publishable"
    : v.startsWith("sb_secret_")
      ? "chiave secret"
      : v.startsWith("eyJ")
        ? "chiave JWT"
        : v.startsWith("http")
          ? "URL"
          : "valore";
  return `ok (${kind}${v !== value ? ", ripulito da spazi/virgolette" : ""})`;
}

/**
 * Diagnostica della configurazione (per il deploy su Vercel): quali variabili vede il sito
 * e se il database risponde. Non espone chiavi né dati dei clienti.
 */
export async function GET() {
  const vars = {
    NEXT_PUBLIC_SITE_URL: describe(process.env.NEXT_PUBLIC_SITE_URL),
    NEXT_PUBLIC_SUPABASE_URL: describe(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: describe(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: describe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SECRET_KEY: describe(process.env.SUPABASE_SECRET_KEY),
    SUPABASE_SERVICE_ROLE_KEY: describe(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };

  let letturaPubblica: string;
  let letturaServer: string;
  if (!isSupabaseConfigured) {
    letturaPubblica = letturaServer = "non provata: URL o chiave publishable mancanti";
  } else {
    const pub = await getPublicSupabase().from("categories").select("id", { count: "exact", head: true });
    letturaPubblica = pub.error ? `ERRORE: ${pub.error.message}` : `ok (${pub.count ?? 0} categorie nel menù)`;
    try {
      const srv = await getServiceSupabase().from("orders").select("id", { count: "exact", head: true });
      letturaServer = srv.error ? `ERRORE: ${srv.error.message}` : "ok";
    } catch (e) {
      letturaServer = `ERRORE: ${e instanceof Error ? e.message : "sconosciuto"}`;
    }
  }

  return NextResponse.json(
    {
      configurato: isSupabaseConfigured,
      supabase: SUPABASE_URL ? new URL(SUPABASE_URL).hostname : "(nessun URL valido)",
      chiavePubblica: SUPABASE_ANON_KEY ? "presente" : "mancante",
      sito: SITE.url,
      variabili: vars,
      database: { letturaPubblica, letturaServer },
      nota: "Le variabili NEXT_PUBLIC_* vengono lette durante la build: dopo averle modificate su Vercel serve un nuovo deploy.",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
