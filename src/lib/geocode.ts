import "server-only";

export type GeocodeResult = { lat: number; lng: number; formatted: string; city?: string };

/**
 * Geocodifica un indirizzo. Usa Google Geocoding se è configurata GOOGLE_MAPS_API_KEY,
 * altrimenti OpenStreetMap Nominatim (gratuito, max 1 richiesta/secondo).
 */
// Cache in memoria: il checkout ricalcola il preventivo a ogni modifica del carrello,
// senza cache ogni volta si interrogherebbe il servizio di geocodifica.
const CACHE_TTL = 24 * 3600_000;
const CACHE_MAX = 1000;
const cache = new Map<string, { at: number; result: GeocodeResult }>();
// Nominatim ammette al massimo 1 richiesta al secondo
let nominatimQueue: Promise<unknown> = Promise.resolve();
function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = nominatimQueue.then(fn);
  nominatimQueue = run.catch(() => undefined).then(() => new Promise((r) => setTimeout(r, 1100)));
  return run;
}

export async function geocodeAddress(q: { street: string; number?: string; city: string; cap?: string }): Promise<GeocodeResult | null> {
  const cacheKey = [q.street, q.number ?? "", q.city, q.cap ?? ""].map((p) => p.trim().toLowerCase()).join("|");
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.result;
  const result = await geocodeUncached(q);
  if (result) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
    cache.set(cacheKey, { at: Date.now(), result });
  }
  return result;
}

async function geocodeUncached(q: { street: string; number?: string; city: string; cap?: string }): Promise<GeocodeResult | null> {
  const line = `${q.street}${q.number ? " " + q.number : ""}, ${q.cap ? q.cap + " " : ""}${q.city}, Catania, Italia`;
  const key = process.env.GOOGLE_MAPS_API_KEY;
  try {
    if (key) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(line)}&region=it&language=it&key=${key}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      const r = data.results?.[0];
      if (!r) return null;
      const city = r.address_components?.find((c: { types: string[] }) => c.types.includes("locality"))?.long_name;
      return { lat: r.geometry.location.lat, lng: r.geometry.location.lng, formatted: r.formatted_address, city };
    }
    const params = new URLSearchParams({
      street: `${q.number ? q.number + " " : ""}${q.street}`,
      city: q.city,
      county: "Catania",
      country: "Italia",
      format: "jsonv2",
      addressdetails: "1",
      limit: "1",
    });
    if (q.cap) params.set("postalcode", q.cap);
    let res = await throttled(() => fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "RistOroDellEtna/1.0 (ordini online)", "Accept-Language": "it" },
      cache: "no-store",
    }));
    let data = await res.json();
    if (!data?.length) {
      // riprovo con ricerca libera (civici non sempre mappati su OSM)
      res = await throttled(() => fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: line, format: "jsonv2", limit: "1", addressdetails: "1" })}`, {
        headers: { "User-Agent": "RistOroDellEtna/1.0 (ordini online)", "Accept-Language": "it" },
        cache: "no-store",
      }));
      data = await res.json();
    }
    const r = data?.[0];
    if (!r) return null;
    const a = r.address ?? {};
    return { lat: Number(r.lat), lng: Number(r.lon), formatted: r.display_name, city: a.town ?? a.city ?? a.village };
  } catch (e) {
    console.error("geocode error", e);
    return null;
  }
}
