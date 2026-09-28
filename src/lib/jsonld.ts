import { SITE } from "./site";
import type { MenuCategory, OpeningHour, Settings } from "./types";

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function restaurantJsonLd(settings: Settings, hours: OpeningHour[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE.url}/#restaurant`,
    name: SITE.name,
    alternateName: "Oro dell'Etna",
    description: SITE.description,
    url: SITE.url,
    telephone: settings.phone,
    servesCuisine: ["Pizza", "Italiana", "Siciliana", "Carne alla brace"],
    priceRange: SITE.priceRange,
    acceptsReservations: true,
    hasMenu: `${SITE.url}/menu`,
    image: `${SITE.url}/opengraph-image`,
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.address.street,
      postalCode: SITE.address.cap,
      addressLocality: SITE.address.city,
      addressRegion: SITE.address.province,
      addressCountry: SITE.address.country,
    },
    geo: { "@type": "GeoCoordinates", latitude: SITE.geo.lat, longitude: SITE.geo.lng },
    sameAs: [SITE.instagram, SITE.facebook],
    aggregateRating: { "@type": "AggregateRating", ratingValue: SITE.rating.value, reviewCount: SITE.rating.count, bestRating: 5 },
    openingHoursSpecification: hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DAY[h.weekday],
      opens: h.open_time.slice(0, 5),
      closes: h.close_time.slice(0, 5) === "00:00" ? "23:59" : h.close_time.slice(0, 5),
    })),
  };
}

export function menuJsonLd(categories: MenuCategory[]) {
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `Menù ${SITE.name}`,
    url: `${SITE.url}/menu`,
    inLanguage: "it",
    hasMenuSection: categories.map((c) => ({
      "@type": "MenuSection",
      name: c.name,
      hasMenuItem: c.products.map((p) => ({
        "@type": "MenuItem",
        name: p.name,
        description: p.description ?? undefined,
        offers: { "@type": "Offer", price: p.price.toFixed(2), priceCurrency: "EUR" },
        suitableForDiet: p.tags.includes("vegano")
          ? "https://schema.org/VeganDiet"
          : p.tags.includes("vegetariano")
            ? "https://schema.org/VegetarianDiet"
            : undefined,
      })),
    })),
  };
}

/** Serializza JSON-LD in modo sicuro per <script> */
export function jsonLdScript(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
