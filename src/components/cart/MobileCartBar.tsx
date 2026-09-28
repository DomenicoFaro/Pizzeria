"use client";

import { usePathname } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { formatEuro } from "@/lib/pricing";
import { useCart } from "./CartProvider";

export function MobileCartBar() {
  const { count, subtotal, hydrated, setDrawerOpen, bump } = useCart();
  const pathname = usePathname();
  if (!hydrated || count === 0 || pathname.startsWith("/checkout") || pathname.startsWith("/ordine/")) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="animate-slide-up flex h-14 w-full items-center justify-between rounded-full bg-brace px-5 text-white shadow-xl shadow-black/25"
      >
        <span className="flex items-center gap-3">
          <span key={bump} className="relative animate-pop">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span className="absolute -right-2.5 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-oro px-1 text-xs font-bold text-lava">{count}</span>
          </span>
          <span className="font-semibold">Vedi carrello</span>
        </span>
        <span className="font-bold tabular-nums">{formatEuro(subtotal)}</span>
      </button>
    </div>
  );
}
