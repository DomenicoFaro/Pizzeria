"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { inputClass } from "@/components/forms/Field";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("errore") === "permessi" ? "Questo account non fa parte dello staff. Chiedi al titolare di abilitarti." : null,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await getBrowserSupabase().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError("Email o password non corretti.");
    router.replace("/admin/ordini");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-crema p-8 shadow-2xl">
      <Logo />
      <h1 className="mt-6 font-serif text-2xl font-bold">Pannello staff</h1>
      <div className="mt-6 space-y-3">
        <label htmlFor="email" className="sr-only">Email</label>
        <input id="email" type="email" autoComplete="username" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} h-12`} />
        <label htmlFor="password" className="sr-only">Password</label>
        <input id="password" type="password" autoComplete="current-password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} h-12`} />
      </div>
      {error && <p className="mt-3 text-sm text-brace" role="alert">{error}</p>}
      <button type="submit" disabled={busy} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brace font-semibold text-white disabled:opacity-60">
        {busy && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />} Accedi
      </button>
    </form>
  );
}
