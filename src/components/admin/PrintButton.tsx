"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export function PrintButton() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <button type="button" onClick={() => window.print()} className="flex h-11 items-center gap-2 rounded-full bg-lava px-5 font-semibold text-crema">
      <Printer className="h-4 w-4" aria-hidden="true" /> Stampa comanda
    </button>
  );
}
