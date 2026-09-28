// Dati statici del locale. I recapiti modificabili (telefono, email…) stanno nella tabella `settings`.
export const SITE = {
  name: "RistOro dell'Etna",
  fullName: "RistOro dell'Etna – Ristorante Pizzeria Braceria",
  claim: "Pizza, brace e sapori dell'Etna.",
  description:
    "Ristorante, pizzeria e braceria a Nicolosi, alle pendici dell'Etna. Pizza con impasto alto e soffice cotta nel forno a legna, carne alla brace, primi della tradizione. Ordina online per asporto o consegna a domicilio.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://ristorodelletna.it",
  address: {
    street: "Viale della Regione 27",
    cap: "95030",
    city: "Nicolosi",
    province: "CT",
    region: "Sicilia",
    country: "IT",
  },
  geo: { lat: 37.617867, lng: 15.0248519 },
  instagram: "https://www.instagram.com/ristorodelletna_nicolosi/",
  instagramHandle: "@ristorodelletna_nicolosi",
  facebook: "https://www.facebook.com/ristorodelletna",
  rating: { value: 4.3, count: 1950 },
  priceRange: "€20–30",
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=RistOro+dell%27Etna+Viale+della+Regione+27+Nicolosi",
};

export const fullAddress = `${SITE.address.street}, ${SITE.address.cap} ${SITE.address.city} (${SITE.address.province})`;

export function telHref(phone: string | null | undefined): string {
  return `tel:${(phone ?? "").replace(/[^+\d]/g, "")}`;
}

export function whatsappHref(number: string | null | undefined, text?: string): string {
  const n = (number ?? "").replace(/\D/g, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
