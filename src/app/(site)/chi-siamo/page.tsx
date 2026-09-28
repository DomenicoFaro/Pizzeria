import type { Metadata } from "next";
import Link from "next/link";
import { Beef, Flame, Heart, Mountain, Wheat } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = {
  title: "Chi siamo",
  description: "La storia di RistOro dell'Etna a Nicolosi: impasto alto nel forno a legna, braceria e accoglienza siciliana alle pendici del vulcano.",
  alternates: { canonical: "/chi-siamo" },
};

export default function AboutPage() {
  return (
    <>
      <PageHero eyebrow="Chi siamo" title="Una casa ai piedi del vulcano">
        Da “Oro dell&apos;Etna” a RistOro dell&apos;Etna: la stessa passione per la buona tavola, a Nicolosi.
      </PageHero>
      <div className="bg-farina">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-16 text-lg leading-relaxed sm:px-6">
          <p>
            Siamo a Nicolosi, porta dell&apos;Etna, dove l&apos;aria di montagna mette appetito e la terra lavica regala sapori unici. Qui abbiamo costruito un posto dove sentirsi a casa: una pizzeria con il forno a legna, una braceria vera e una cucina che parla siciliano.
          </p>
          <p>Ogni sera accendiamo il fuoco con la stessa idea: ingredienti buoni, trattati con rispetto, e un servizio che ti faccia venire voglia di tornare.</p>
        </div>
        <div className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-2">
          {[
            { Icon: Wheat, t: "L'impasto", d: "Alto, soffice e alveolato, con il cornicione “a nido d'ape”. Lunga lievitazione per una pizza leggera e digeribile. Su richiesta anche con impasto integrale." },
            { Icon: Flame, t: "Il forno a legna", d: "La fiamma viva cuoce la pizza in pochi minuti ad alta temperatura: fondo croccante, cuore morbido e quel profumo che non si dimentica." },
            { Icon: Beef, t: "La braceria", d: "Tagli di qualità, costine che si staccano dall'osso, filetto, misto di carne alla griglia, carne di cavallo alla catanese e agnello di montagna." },
            { Icon: Heart, t: "L'accoglienza", d: "Un personale cordiale e disponibile: vuoi togliere o aggiungere un ingrediente? Chiedi pure, la pizza la facciamo come piace a te." },
          ].map(({ Icon, t, d }) => (
            <article key={t} className="rounded-3xl bg-white p-8 ring-1 ring-lava/5">
              <Icon className="h-8 w-8 text-brace" aria-hidden="true" />
              <h2 className="mt-4 font-serif text-2xl font-bold">{t}</h2>
              <p className="mt-2 text-pietra">{d}</p>
            </article>
          ))}
        </div>
      </div>
      <section className="bg-lava-texture py-16 text-center text-crema">
        <Mountain className="mx-auto h-10 w-10 text-oro" aria-hidden="true" />
        <p className="mx-auto mt-4 max-w-xl font-serif text-3xl">Pizza, brace e sapori dell&apos;Etna.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 px-4 sm:flex-row">
          <Link href="/ordina" className="inline-flex h-12 items-center justify-center rounded-full bg-brace px-6 font-semibold text-white">Ordina ora</Link>
          <Link href="/prenota" className="inline-flex h-12 items-center justify-center rounded-full border border-crema/40 px-6 font-semibold">Prenota un tavolo</Link>
        </div>
      </section>
    </>
  );
}
