import { normalizeOrigin } from "../site";

// accetta anche l'URL incollato con "/rest/v1/" o senza https://
export const SUPABASE_URL = normalizeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL, "");
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
