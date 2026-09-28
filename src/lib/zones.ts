import { SITE } from "./site";
import type { DeliveryZone } from "./types";

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Ray casting: polygon = [[lng, lat], ...] */
export function pointInPolygon(pt: { lat: number; lng: number }, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = yi > pt.lat !== yj > pt.lat && pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Zona di consegna che copre il punto (la più vicina/economica per ordine di posizione) */
export function findZone(pt: { lat: number; lng: number }, zones: DeliveryZone[]): DeliveryZone | null {
  const distance = haversineKm(SITE.geo, pt);
  const sorted = [...zones].filter((z) => z.is_active).sort((a, b) => a.position - b.position);
  for (const z of sorted) {
    if (z.polygon && z.polygon.length >= 3) {
      if (pointInPolygon(pt, z.polygon)) return z;
    } else if (z.radius_km != null && distance <= Number(z.radius_km)) {
      return z;
    }
  }
  return null;
}
