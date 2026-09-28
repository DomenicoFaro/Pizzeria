"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Phone, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { telHref } from "@/lib/site";
import { formatEuro } from "@/lib/pricing";
import { Logo } from "./Logo";
import { useSiteInfo } from "./SiteInfo";

const NAV = [
  { href: "/menu", label: "Menù" },
  { href: "/ordina", label: "Ordina" },
  { href: "/chi-siamo", label: "Chi siamo" },
  { href: "/eventi", label: "Eventi" },
  { href: "/prenota", label: "Prenota" },
  { href: "/contatti", label: "Contatti" },
];

export function Header() {
  const pathname = usePathname();
  const { count, subtotal, bump, setDrawerOpen, hydrated } = useCart();
  const { settings } = useSiteInfo();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const transparent = pathname === "/" && !scrolled && !open;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // chiude il menu mobile a ogni cambio pagina
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        transparent ? "bg-transparent" : "bg-lava/95 shadow-lg shadow-black/10 backdrop-blur"
      }`}
    >
      {settings.announcement && (
        <div className="bg-oro px-4 py-1.5 text-center text-sm font-medium text-lava">{settings.announcement}</div>
      )}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" aria-label="RistOro dell'Etna — home" className="min-w-0 shrink">
          <Logo light />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principale">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-white/10 text-oro" : "text-crema/85 hover:bg-white/5 hover:text-crema"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <a
            href={telHref(settings.phone)}
            className="hidden h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-crema/90 hover:text-crema md:inline-flex"
          >
            <Phone className="h-4 w-4" aria-hidden="true" />
            {settings.phone}
          </a>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative inline-flex h-11 items-center gap-2 rounded-full bg-brace px-4 text-sm font-semibold text-white shadow-md shadow-brace/30 transition hover:bg-brace-dark"
            aria-label={`Apri il carrello, ${count} prodotti`}
          >
            <ShoppingBag key={bump} className={`h-5 w-5 ${bump ? "animate-pop" : ""}`} aria-hidden="true" />
            <span className="hidden sm:inline">{hydrated && count > 0 ? formatEuro(subtotal) : "Carrello"}</span>
            {hydrated && count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-oro px-1 text-xs font-bold text-lava">
                {count}
              </span>
            )}
          </button>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-crema hover:bg-white/10 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="animate-fade-in border-t border-white/10 bg-lava px-4 pb-6 pt-2 lg:hidden" aria-label="Menu mobile">
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  className={`flex h-12 items-center rounded-xl px-4 text-base font-medium ${
                    pathname.startsWith(n.href) ? "bg-white/10 text-oro" : "text-crema"
                  }`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/area-cliente" className="flex h-12 items-center rounded-xl px-4 text-base font-medium text-crema/80">
                I miei ordini
              </Link>
            </li>
          </ul>
          <a
            href={telHref(settings.phone)}
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full border border-oro/50 text-base font-semibold text-oro"
          >
            <Phone className="h-5 w-5" aria-hidden="true" /> Chiama {settings.phone}
          </a>
        </nav>
      )}
    </header>
  );
}
