"use client";

import { useEffect, useState } from "react";
import { getOpenStatus } from "@/lib/schedule";
import { useSiteInfo } from "./SiteInfo";

/** Badge "Aperto ora · consegna in ~45 min" / "Chiuso · riapriamo…" calcolato in tempo reale */
export function OpenBadge({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { settings, hours, closures } = useSiteInfo();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'orario è noto solo lato client
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!now) return <span className="inline-block h-8 w-56 animate-pulse rounded-full bg-white/10" aria-hidden="true" />;

  const status = getOpenStatus(now, hours, closures);
  let text = status.label;
  let open = status.isOpen;
  if (settings.orders_paused) {
    text = status.isOpen ? "Aperto · ordini online sospesi" : status.label;
    open = false;
  } else if (status.isOpen) {
    text = settings.delivery_enabled
      ? `Aperto ora · consegna in ~${settings.prep_time_delivery} min`
      : `Aperto ora · asporto in ~${settings.prep_time_pickup} min`;
  }

  const base = variant === "dark" ? "bg-black/40 text-crema ring-white/15 backdrop-blur" : "bg-white text-lava ring-lava/10";
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ${base}`} role="status">
      <span className="relative flex h-2.5 w-2.5">
        {open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${open ? "bg-green-500" : "bg-brace"}`} />
      </span>
      {text}
    </span>
  );
}
