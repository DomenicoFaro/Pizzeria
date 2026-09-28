import type { Metadata } from "next";
import { ReservationForm } from "@/components/forms/ReservationForm";
import { HoursTable } from "@/components/site/HoursTable";
import { PageHero } from "@/components/site/PageHero";
import { getHours, getSettings } from "@/lib/data";
import { telHref } from "@/lib/site";

export const metadata: Metadata = {
  title: "Prenota un tavolo",
  description: "Prenota il tuo tavolo da RistOro dell'Etna a Nicolosi: sala interna, posti all'aperto e sala privata.",
  alternates: { canonical: "/prenota" },
};

export default async function BookPage() {
  const [hours, settings] = await Promise.all([getHours(), getSettings()]);
  return (
    <>
      <PageHero eyebrow="Prenotazioni" title="Prenota un tavolo">Sala interna, posti all&apos;aperto e tanta voglia di stare insieme.</PageHero>
      <div className="bg-farina">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl bg-white p-6 ring-1 ring-lava/5 sm:p-8">
            <ReservationForm />
          </div>
          <aside className="space-y-5">
            <div className="rounded-3xl bg-white p-6 ring-1 ring-lava/5">
              <h2 className="mb-3 font-serif text-xl font-bold">Orari</h2>
              <HoursTable hours={hours} />
            </div>
            <div className="rounded-3xl bg-lava p-6 text-crema">
              <p className="font-serif text-xl">Preferisci chiamare?</p>
              <a href={telHref(settings.phone)} className="mt-3 inline-flex h-12 items-center rounded-full bg-oro px-5 font-semibold text-lava">{settings.phone}</a>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
