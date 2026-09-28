export function NotConfigured() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="rounded-2xl bg-white p-6 text-pietra ring-1 ring-lava/10">
        Il menù non è ancora disponibile. Configura Supabase (vedi <code>README.md</code>) e carica i dati iniziali.
      </p>
    </div>
  );
}
