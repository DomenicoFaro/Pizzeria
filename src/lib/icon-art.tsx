/* Marchio (Etna + fiamma) disegnato per ImageResponse: favicon, icone PWA, Open Graph */
export function IconArt({ size, padding = 0 }: { size: number; padding?: number }) {
  const s = size - padding * 2;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#1c1a19" }}>
      <svg width={s} height={s} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="23" fill="#1c1a19" stroke="#d4a24c" strokeWidth="1.5" />
        <path d="M7 36 L19 19 L22 22 L26 15 L41 36 Z" fill="#3a3633" />
        <path d="M19 19 L22 22 L26 15 L29 19.5 L26 18.5 L23 24 L20.5 21.5 Z" fill="#f6f0e6" />
        <path d="M26 15 C24 11 27 9 25.5 5 C29 8 30.5 11 28 15 Z" fill="#c8412b" />
        <path d="M26.5 14 C25.8 12 27.2 10.8 26.8 9 C28.3 10.6 28.6 12.4 27.5 14 Z" fill="#d4a24c" />
        <path d="M7 36 H41" stroke="#d4a24c" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
