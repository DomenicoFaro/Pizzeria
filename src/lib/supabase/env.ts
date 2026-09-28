import { cleanEnv, normalizeOrigin } from "../site";

// Tollerante a valori incollati a mano su Vercel: spazi, virgolette, "/rest/v1/", https mancante.
// Una variabile presente ma vuota non deve nascondere l'alternativa compilata (ANON_KEY vuota → PUBLISHABLE_KEY).
// NB: le NEXT_PUBLIC_* vanno lette per nome esteso, così Next le inserisce nel codice del browser.
export const SUPABASE_URL = normalizeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL, "");
export const SUPABASE_ANON_KEY =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) || cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
