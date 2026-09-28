"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, CalendarDays, ClipboardList, LogOut, Percent, Settings, Users, UtensilsCrossed } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { getBrowserSupabase } from "@/lib/supabase/client";

const ITEMS = [
  { href: "/admin/ordini", label: "Ordini", Icon: ClipboardList, admin: false },
  { href: "/admin/prenotazioni", label: "Prenotazioni", Icon: CalendarDays, admin: false },
  { href: "/admin/menu", label: "Menù", Icon: UtensilsCrossed, admin: false },
  { href: "/admin/impostazioni", label: "Impostazioni", Icon: Settings, admin: true },
  { href: "/admin/promozioni", label: "Promozioni", Icon: Percent, admin: true },
  { href: "/admin/clienti", label: "Clienti", Icon: Users, admin: true },
  { href: "/admin/report", label: "Report", Icon: BarChart3, admin: true },
];

export function AdminNav({ role, email }: { role: "admin" | "staff"; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = ITEMS.filter((i) => !i.admin || role === "admin");
  const logout = async () => {
    await getBrowserSupabase().auth.signOut();
    router.replace("/admin/login");
  };
  return (
    <>
      <aside className="bg-lava-texture fixed inset-y-0 left-0 hidden w-60 flex-col p-4 text-crema lg:flex print:hidden">
        <Link href="/" className="px-2 py-3"><Logo light compact /></Link>
        <nav className="mt-6 flex-1 space-y-1" aria-label="Admin">
          {items.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${pathname.startsWith(href) ? "bg-white/10 text-oro" : "text-crema/80 hover:bg-white/5"}`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 pt-3 text-xs text-crema/60">
          <p className="truncate px-2">{email} · {role === "admin" ? "Titolare" : "Staff"}</p>
          <button type="button" onClick={logout} className="mt-2 flex h-10 w-full items-center gap-2 rounded-xl px-2 text-sm hover:bg-white/5">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Esci
          </button>
        </div>
      </aside>
      {/* barra inferiore su tablet/telefono */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto border-t border-white/10 bg-lava pb-[env(safe-area-inset-bottom)] text-crema lg:hidden print:hidden" aria-label="Admin">
        {items.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className={`flex min-w-[4.5rem] flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${pathname.startsWith(href) ? "text-oro" : "text-crema/75"}`}>
            <Icon className="h-5 w-5" aria-hidden="true" /> {label}
          </Link>
        ))}
        <button type="button" onClick={logout} className="flex min-w-[4.5rem] flex-col items-center gap-0.5 py-2 text-[11px] text-crema/75">
          <LogOut className="h-5 w-5" aria-hidden="true" /> Esci
        </button>
      </nav>
    </>
  );
}
