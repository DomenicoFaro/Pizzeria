"use client";

import { createContext, useContext } from "react";
import type { Closure, OpeningHour, Settings } from "@/lib/types";

export type SiteInfo = { settings: Settings; hours: OpeningHour[]; closures: Closure[] };

const Ctx = createContext<SiteInfo | null>(null);

export function SiteInfoProvider({ value, children }: { value: SiteInfo; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiteInfo(): SiteInfo {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSiteInfo fuori da SiteInfoProvider");
  return v;
}
