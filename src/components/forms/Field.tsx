export const inputClass =
  "w-full rounded-xl bg-white px-4 text-[16px] ring-1 ring-lava/15 placeholder:text-pietra/60 focus:outline-none focus:ring-2 focus:ring-oro aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-brace";

export function Field({
  id,
  label,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="mt-1 text-sm text-brace">{error}</p>}
    </div>
  );
}

export function FormMessage({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-xl p-4 ${state.ok ? "bg-basilico/10 text-basilico" : "bg-brace/10 text-brace"}`}>
      {state.message}
    </p>
  );
}
