import type { Metadata } from "next";
import { Cake, GlassWater, GraduationCap, Users } from "lucide-react";
import { EventForm } from "@/components/forms/EventForm";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Eventi e cerimonie",
  description: "Sala privata per compleanni, comunioni, lauree, cene aziendali e banchetti a Nicolosi. Richiedi un preventivo.",
  alternates: { canonical: "/eventi" },
};

export default function EventsPage() {
  return (
    <>
      <PageHero eyebrow="Eventi & Cerimonie" title="Festeggia con noi">
        Una sala privata, menù su misura e tutto il calore della nostra cucina per i tuoi momenti importanti.
      </PageHero>
      <div className="bg-farina">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="font-serif text-3xl font-bold">La sala privata</h2>
            <p className="mt-3 text-lg text-pietra">
              Uno spazio riservato per banchetti e ricorrenze, con menù pizza, menù brace o percorsi personalizzati. Bar completo e carta dei vini dell&apos;Etna.
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-3">
              {[
                { Icon: Cake, t: "Compleanni" },
                { Icon: GlassWater, t: "Comunioni e battesimi" },
                { Icon: GraduationCap, t: "Lauree" },
                { Icon: Users, t: "Cene aziendali" },
              ].map(({ Icon, t }) => (
                <li key={t} className="flex items-center gap-3 rounded-2xl bg-white p-4 font-medium ring-1 ring-lava/5">
                  <Icon className="h-6 w-6 shrink-0 text-brace" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-6 ring-1 ring-lava/5 sm:p-8">
            <h2 className="mb-6 font-serif text-2xl font-bold">Richiedi un preventivo</h2>
            <EventForm />
          </div>
        </div>
      </div>
    </>
  );
}
