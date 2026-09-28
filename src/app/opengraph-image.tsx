import { ImageResponse } from "next/og";

export const alt = "RistOro dell'Etna — Pizza, brace e sapori dell'Etna";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 72, background: "linear-gradient(180deg, #141211 0%, #2a1a14 55%, #5a2518 100%)", color: "#f6f0e6", position: "relative" }}>
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
          <path d="M0 520 L320 370 L470 300 L575 230 L610 210 L655 210 L690 230 L815 300 L965 380 L1200 500 L1200 630 L0 630 Z" fill="#2a2725" />
          <path d="M575 230 L610 210 L655 210 L690 230 L665 245 L640 235 L620 252 L595 242 Z" fill="#f6f0e6" opacity="0.25" />
          <path d="M640 215 C 630 260, 665 290, 650 335 S 685 410, 668 470" stroke="#c8412b" strokeWidth="6" fill="none" />
        </svg>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#d4a24c", textTransform: "uppercase" }}>Pizzeria · Braceria · Nicolosi</div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, marginTop: 12 }}>RistOro dell&apos;Etna</div>
        <div style={{ display: "flex", fontSize: 40, marginTop: 8, color: "#ecd3a0" }}>Pizza, brace e sapori dell&apos;Etna.</div>
      </div>
    ),
    size,
  );
}
