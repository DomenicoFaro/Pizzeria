import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/menu", "/ordina", "/chi-siamo", "/eventi", "/prenota", "/contatti", "/allergeni", "/privacy", "/cookie", "/termini"];
  return pages.map((p) => ({
    url: `${SITE.url}${p}`,
    changeFrequency: p === "/menu" || p === "/ordina" ? "daily" : "monthly",
    priority: p === "" ? 1 : p === "/menu" || p === "/ordina" ? 0.9 : 0.5,
  }));
}
