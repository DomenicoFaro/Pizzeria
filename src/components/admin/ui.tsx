"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export const adminInput = "h-11 w-full rounded-xl bg-white px-3 text-[15px] ring-1 ring-lava/15 focus:outline-none focus:ring-2 focus:ring-oro";

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Chiudi" />
      <div className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-crema shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-lava/10 px-5 py-3">
          <h2 className="font-serif text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-lava/5" aria-label="Chiudi">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-lava/10 p-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="inline-flex min-h-11 cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-basilico" : "bg-lava/20"} disabled:opacity-50`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
      </button>
      <span className="text-sm">{label}</span>
    </label>
  );
}

export function Card({ title, children, actions }: { title?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-lava/5">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-serif text-xl font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brace px-5 text-sm font-semibold text-white hover:bg-brace-dark disabled:opacity-50 ${props.className ?? ""}`} />;
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ring-lava/15 hover:bg-lava/5 disabled:opacity-50 ${props.className ?? ""}`} />;
}

/** Riordino drag & drop (HTML5) con frecce come alternativa da tastiera/touch */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
