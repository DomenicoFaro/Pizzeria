export function EtnaMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="23" fill="#1c1a19" stroke="#d4a24c" strokeWidth="1.5" />
      <path d="M7 36 L19 19 L22 22 L26 15 L41 36 Z" fill="#3a3633" />
      <path d="M19 19 L22 22 L26 15 L29 19.5 L26 18.5 L23 24 L20.5 21.5 Z" fill="#f6f0e6" opacity=".9" />
      <path d="M26 15 C24 11 27 9 25.5 5 C29 8 30.5 11 28 15 Z" fill="#c8412b" />
      <path d="M26.5 14 C25.8 12 27.2 10.8 26.8 9 C28.3 10.6 28.6 12.4 27.5 14 Z" fill="#d4a24c" />
      <path d="M7 36 H41" stroke="#d4a24c" strokeWidth="1.5" />
    </svg>
  );
}

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <EtnaMark className="h-9 w-9 shrink-0" />
      <span className="min-w-0 leading-none">
        <span className={`block whitespace-nowrap font-serif text-lg font-bold tracking-tight sm:text-xl ${light ? "text-crema" : "text-lava"}`}>
          Rist<span className="text-oro">O</span>ro <span className="font-normal italic">dell&apos;Etna</span>
        </span>
        {!compact && (
          <span className={`mt-0.5 hidden text-[10px] font-medium uppercase tracking-[0.2em] min-[400px]:block ${light ? "text-oro-light/80" : "text-pietra"}`}>
            Pizzeria · Braceria · Nicolosi
          </span>
        )}
      </span>
    </span>
  );
}
