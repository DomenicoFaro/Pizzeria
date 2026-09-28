import type { Metadata } from "next";
import { Mail, MapPin, Navigation, Phone } from "lucide-react";
import { FacebookIcon, InstagramIcon, WhatsAppIcon } from "@/components/site/BrandIcons";
import { HoursTable } from "@/components/site/HoursTable";
import { LocationMap } from "@/components/site/LocationMap";
import { PageHero } from "@/components/site/PageHero";
import { getHours, getSettings } from "@/lib/data";
import { SITE, fullAddress, telHref, whatsappHref } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Contatti e orari",
  description: `Indirizzo, telefono, WhatsApp e orari di RistOro dell'Etna: ${fullAddress}.`,
  alternates: { canonical: "/contatti" },
};

export default async function ContactPage() {
  const [hours, settings] = await Promise.all([getHours(), getSettings()]);
  const card = "flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-lava/5 transition hover:ring-lava/20";
  return (
    <>
      <PageHero eyebrow="Contatti" title="Vieni a trovarci" />
      <div className="bg-farina">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div className="space-y-3">
            <a href={SITE.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={card}>
              <MapPin className="h-6 w-6 shrink-0 text-brace" aria-hidden="true" />
              <span><span className="block font-semibold">{fullAddress}</span><span className="text-sm text-pietra">Apri in Google Maps</span></span>
              <Navigation className="ml-auto h-5 w-5 text-pietra" aria-hidden="true" />
            </a>
            <a href={telHref(settings.phone)} className={card}>
              <Phone className="h-6 w-6 shrink-0 text-brace" aria-hidden="true" />
              <span><span className="block font-semibold">{settings.phone}</span><span className="text-sm text-pietra">Chiama ora{settings.phone_landline ? ` · fisso ${settings.phone_landline}` : ""}</span></span>
            </a>
            <a href={whatsappHref(settings.whatsapp, "Ciao! Vorrei un'informazione")} target="_blank" rel="noopener noreferrer" className={card}>
              <WhatsAppIcon className="h-6 w-6 shrink-0 text-basilico" />
              <span><span className="block font-semibold">WhatsApp</span><span className="text-sm text-pietra">Scrivici un messaggio</span></span>
            </a>
            {settings.email && (
              <a href={`mailto:${settings.email}`} className={card}>
                <Mail className="h-6 w-6 shrink-0 text-brace" aria-hidden="true" />
                <span className="font-semibold">{settings.email}</span>
              </a>
            )}
            <div className="flex gap-3">
              <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className={`${card} flex-1`}>
                <InstagramIcon className="h-6 w-6 text-brace" /> <span className="font-semibold">{SITE.instagramHandle}</span>
              </a>
              <a href={SITE.facebook} target="_blank" rel="noopener noreferrer" className={`${card} flex-1`}>
                <FacebookIcon className="h-6 w-6 text-brace" /> <span className="font-semibold">Facebook</span>
              </a>
            </div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-lava/5">
              <h2 className="mb-3 font-serif text-xl font-bold">Orari</h2>
              <HoursTable hours={hours} />
            </div>
          </div>
          <div className="min-h-96 overflow-hidden rounded-3xl ring-1 ring-lava/10">
            <LocationMap className="h-full min-h-96" />
          </div>
        </div>
      </div>
    </>
  );
}
