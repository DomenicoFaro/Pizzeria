"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "ristoro-cookie-consent";

/** Il sito usa solo cookie tecnici; il banner informa e registra la scelta. */
export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* storage non disponibile */
    }
  }, []);
  if (!show) return null;
  const save = (value: "all" | "necessary") => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ value, date: new Date().toISOString() }));
    } catch {}
    setShow(false);
  };
  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-xl rounded-2xl bg-lava p-5 text-sm text-crema shadow-2xl ring-1 ring-white/10 lg:bottom-4" role="dialog" aria-label="Preferenze cookie">
      <p>
        Usiamo solo cookie tecnici necessari al funzionamento del sito (carrello, accesso). Nessun cookie di profilazione.{" "}
        <Link href="/cookie" className="text-oro underline underline-offset-2">Cookie policy</Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => save("necessary")} className="h-11 flex-1 rounded-full border border-crema/30 px-4 font-medium hover:bg-white/5">
          Solo necessari
        </button>
        <button type="button" onClick={() => save("all")} className="h-11 flex-1 rounded-full bg-oro px-4 font-semibold text-lava hover:bg-oro-light">
          Ho capito
        </button>
      </div>
    </div>
  );
}
