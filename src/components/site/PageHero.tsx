export function PageHero({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="bg-lava-texture pb-12 pt-[calc(var(--header-h)+3rem)] text-crema">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-oro">{eyebrow}</p>}
        <h1 className="font-serif text-4xl font-bold sm:text-5xl">{title}</h1>
        {children && <div className="mt-3 max-w-2xl text-lg text-crema/80">{children}</div>}
      </div>
    </section>
  );
}
