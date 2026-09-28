"use client";

import { Bike, Store } from "lucide-react";
import { useSiteInfo } from "@/components/site/SiteInfo";
import { useCart } from "./CartProvider";

export function ModeToggle({ size = "md" }: { size?: "md" | "lg" }) {
  const { mode, setMode } = useCart();
  const { settings } = useSiteInfo();
  const opts = [
    { value: "delivery" as const, label: "Consegna", sub: `~${settings.prep_time_delivery} min`, Icon: Bike, enabled: settings.delivery_enabled },
    { value: "pickup" as const, label: "Asporto", sub: `~${settings.prep_time_pickup} min`, Icon: Store, enabled: settings.pickup_enabled },
  ];
  const h = size === "lg" ? "h-16" : "h-12";
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-lava/5 p-1" role="radiogroup" aria-label="Modalità di ordine">
      {opts.map(({ value, label, sub, Icon, enabled }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!enabled}
            onClick={() => setMode(value)}
            className={`${h} flex items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
              active ? "bg-lava text-crema shadow" : "text-lava hover:bg-white/60"
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-left leading-tight">
              {label}
              {size === "lg" && <span className={`block text-xs font-normal ${active ? "text-crema/70" : "text-pietra"}`}>{enabled ? sub : "non disponibile"}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
