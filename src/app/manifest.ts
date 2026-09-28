import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RistOro dell'Etna",
    short_name: "RistOro",
    description: "Pizza, brace e sapori dell'Etna. Ordina online da Nicolosi.",
    start_url: "/ordina",
    scope: "/",
    display: "standalone",
    background_color: "#1c1a19",
    theme_color: "#1c1a19",
    lang: "it",
    categories: ["food"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Ordina", url: "/ordina" },
      { name: "Prenota un tavolo", url: "/prenota" },
    ],
  };
}
