import Link from "next/link";
import { MapPin, Phone, Mail } from "lucide-react";
import { SITE, fullAddress, telHref, whatsappHref } from "@/lib/site";
import type { OpeningHour, Settings } from "@/lib/types";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "./BrandIcons";
import { HoursTable } from "./HoursTable";
import { Logo } from "./Logo";

export function Footer({ settings, hours }: { settings: Settings; hours: OpeningHour[] }) {
  return (
    <footer className="bg-lava-texture pb-28 pt-14 text-crema/80 lg:pb-10">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="text-sm leading-relaxed">{SITE.claim} Pizza con impasto alto nel forno a legna, carne alla brace e cucina siciliana, alle pendici dell&apos;Etna.</p>
          <div className="flex gap-2">
            <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 hover:text-oro">
              <InstagramIcon />
            </a>
            <a href={SITE.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 hover:text-oro">
              <FacebookIcon />
            </a>
            <a href={whatsappHref(settings.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 hover:text-oro">
              <WhatsAppIcon />
            </a>
          </div>
        </div>

        <div>
          <h2 className="mb-4 font-serif text-lg text-oro">Contatti</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-oro" aria-hidden="true" />
              <a href={SITE.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-crema">{fullAddress}</a>
            </li>
            <li className="flex gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-oro" aria-hidden="true" />
              <span>
                <a href={telHref(settings.phone)} className="hover:text-crema">{settings.phone}</a>
                {settings.phone_landline && (
                  <>
                    <br />
                    <a href={telHref(settings.phone_landline)} className="hover:text-crema">{settings.phone_landline}</a>
                  </>
                )}
              </span>
            </li>
            {settings.email && (
              <li className="flex gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-oro" aria-hidden="true" />
                <a href={`mailto:${settings.email}`} className="hover:text-crema">{settings.email}</a>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h2 className="mb-4 font-serif text-lg text-oro">Orari</h2>
          <HoursTable hours={hours} />
        </div>

        <div>
          <h2 className="mb-4 font-serif text-lg text-oro">Link utili</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm lg:grid-cols-1">
            <li><Link href="/ordina" className="hover:text-crema">Ordina online</Link></li>
            <li><Link href="/prenota" className="hover:text-crema">Prenota un tavolo</Link></li>
            <li><Link href="/eventi" className="hover:text-crema">Eventi e cerimonie</Link></li>
            <li><Link href="/area-cliente" className="hover:text-crema">I miei ordini</Link></li>
            <li><Link href="/allergeni" className="hover:text-crema">Informativa allergeni</Link></li>
            <li><Link href="/termini" className="hover:text-crema">Termini di vendita</Link></li>
            <li><Link href="/privacy" className="hover:text-crema">Privacy</Link></li>
            <li><Link href="/cookie" className="hover:text-crema">Cookie</Link></li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-7xl border-t border-white/10 px-4 pt-6 text-xs text-crema/60 sm:px-6">
        © {new Date().getFullYear()} {SITE.name} · {fullAddress}
      </div>
    </footer>
  );
}
