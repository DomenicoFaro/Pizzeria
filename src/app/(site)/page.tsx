import Link from "next/link";
import { ArrowRight, Beef, CalendarHeart, ChefHat, Flame, MapPin, Phone, Star, Wheat } from "lucide-react";
import { ProductImage } from "@/components/menu/ProductImage";
import { HoursTable } from "@/components/site/HoursTable";
import { LocationMap } from "@/components/site/LocationMap";
import { OpenBadge } from "@/components/site/OpenBadge";
import { getMenu, getPublicInfo } from "@/lib/data";
import { jsonLdScript, restaurantJsonLd } from "@/lib/jsonld";
import { formatEuro } from "@/lib/pricing";
import { SITE, fullAddress, telHref } from "@/lib/site";

export const revalidate = 60;

export default async function HomePage() {
  const [{ settings, hours }, menu] = await Promise.all([getPublicInfo(), getMenu()]);
  const featured = menu
    .flatMap((c) => c.products.filter((p) => p.is_featured && p.is_available).map((p) => ({ ...p, slug: c.slug })))
    .slice(0, 6);

  return (
    <>
      {/* HERO */}
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden text-crema sm:items-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,#5a2518_0%,#2a1a14_45%,#141211_100%)]" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-28 pt-32 sm:px-6 sm:pb-16">
          <div className="max-w-2xl">
            <OpenBadge />
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-oro">Ristorante · Pizzeria · Braceria</p>
            <h1 className="mt-3 font-serif text-5xl font-bold leading-[1.05] sm:text-7xl">
              Pizza, brace <span className="block italic text-oro">e sapori dell&apos;Etna.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-crema/85">
              Impasto alto e soffice cotto nel forno a legna, carni scelte sulla brace e la cucina di casa nostra, alle pendici del vulcano a Nicolosi.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/ordina" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brace px-8 text-lg font-semibold text-white shadow-xl shadow-brace/30 transition hover:bg-brace-dark">
                Ordina ora <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link href="/prenota" className="inline-flex h-14 items-center justify-center rounded-full border border-crema/40 px-8 text-lg font-semibold text-crema backdrop-blur transition hover:bg-white/10">
                Prenota un tavolo
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-crema/75">
              <span className="flex text-oro" aria-hidden="true">
                {[0, 1, 2, 3].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                <Star className="h-4 w-4 fill-current opacity-40" />
              </span>
              {SITE.rating.value.toLocaleString("it-IT")}/5 su Google · circa {SITE.rating.count.toLocaleString("it-IT")} recensioni
            </p>
          </div>
        </div>
      </section>

      {/* SPECIALITÀ */}
      <section className="bg-farina py-20" aria-labelledby="specialita">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brace-dark">Le nostre specialità</p>
          <h2 id="specialita" className="mt-2 font-serif text-4xl font-bold">Tre anime, una sola cucina</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { Icon: Flame, title: "Pizza nel forno a legna", text: "Impasto alto e alveolato, cornicione a nido d'ape, leggerissimo e digeribile. Anche integrale.", href: "/menu#cat-pizze-classiche" },
              { Icon: Beef, title: "La braceria", text: "Costine che si staccano dall'osso, filetto, misto alla griglia, cavallo alla catanese e agnello di montagna.", href: "/menu#cat-dalla-brace" },
              { Icon: ChefHat, title: "Primi della tradizione", text: "Pasta fresca, Norma, ravioli al pistacchio e crema di porcini: i sapori di Sicilia, fatti in casa.", href: "/menu#cat-primi" },
            ].map(({ Icon, title, text, href }) => (
              <Link key={title} href={href} className="group rounded-3xl bg-white p-7 ring-1 ring-lava/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-lava/5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lava text-oro">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-serif text-2xl font-bold">{title}</h3>
                <p className="mt-2 text-pietra">{text}</p>
                <span className="mt-4 inline-flex items-center gap-1 font-semibold text-brace-dark">
                  Scopri <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>

          {featured.length > 0 && (
            <>
              <h3 className="mt-16 font-serif text-2xl font-bold">I più amati</h3>
              <ul className="no-scrollbar -mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
                {featured.map((p) => (
                  <li key={p.id} className="w-72 shrink-0 snap-start sm:w-auto">
                    <Link href="/ordina" className="block overflow-hidden rounded-3xl bg-white ring-1 ring-lava/5 transition hover:shadow-xl hover:shadow-lava/5">
                      <ProductImage src={p.image_url} alt={p.name} className="aspect-[4/3] w-full" sizes="(max-width:640px) 288px, 33vw" />
                      <div className="flex items-start justify-between gap-3 p-5">
                        <div>
                          <h4 className="font-serif text-xl font-bold">{p.name}</h4>
                          {p.description && <p className="mt-1 line-clamp-2 text-sm text-pietra">{p.description}</p>}
                        </div>
                        <span className="shrink-0 font-semibold">{formatEuro(p.price)}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      {/* IMPASTO */}
      <section className="bg-lava-texture py-20 text-crema" aria-labelledby="impasto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-oro">Il nostro impasto</p>
            <h2 id="impasto" className="mt-2 font-serif text-4xl font-bold">Alto, soffice, a nido d&apos;ape</h2>
            <p className="mt-5 text-lg text-crema/80">
              Lunga lievitazione, farine selezionate e la fiamma viva del forno a legna: il risultato è un cornicione alveolato e leggero, che si digerisce bene e ti fa venire voglia di un&apos;altra fetta.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                { Icon: Wheat, t: "Anche integrale", d: "Chiedi l'impasto integrale su qualsiasi pizza." },
                { Icon: Flame, t: "Forno a legna", d: "Cottura rapida ad alta temperatura." },
              ].map(({ Icon, t, d }) => (
                <li key={t} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                  <Icon className="h-6 w-6 text-oro" aria-hidden="true" />
                  <p className="mt-3 font-semibold">{t}</p>
                  <p className="text-sm text-crema/70">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* RECENSIONI */}
      <section className="bg-farina py-20" aria-labelledby="recensioni">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brace-dark">Dicono di noi</p>
          <h2 id="recensioni" className="mt-2 font-serif text-4xl font-bold">
            {SITE.rating.value.toLocaleString("it-IT")}<span className="text-oro">★</span> su Google
          </h2>
          <p className="mt-2 text-pietra">Circa {SITE.rating.count.toLocaleString("it-IT")} recensioni. Ecco cosa ci riconoscono più spesso i nostri ospiti:</p>
          <ul className="mt-10 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["L'impasto", "Alto, soffice e digeribile, con il cornicione alveolato."],
              ["La brace", "Tagli di qualità e costine tenerissime."],
              ["Il personale", "Cordiale, disponibile e aperto alle personalizzazioni."],
              ["La posizione", "Alle pendici dell'Etna, con posti all'aperto."],
            ].map(([t, d]) => (
              <li key={t} className="rounded-3xl bg-white p-6 ring-1 ring-lava/5">
                <p className="flex text-oro" aria-hidden="true">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}</p>
                <p className="mt-3 font-serif text-xl font-bold">{t}</p>
                <p className="mt-1 text-pietra">{d}</p>
              </li>
            ))}
          </ul>
          <a href={SITE.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full px-5 font-semibold text-brace-dark hover:bg-white">
            Leggi le recensioni su Google <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </section>

      {/* EVENTI */}
      <section className="bg-crema-dark py-20" aria-labelledby="eventi">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl bg-lava-texture p-8 text-crema sm:p-12">
            <CalendarHeart className="h-10 w-10 text-oro" aria-hidden="true" />
            <h2 id="eventi" className="mt-4 font-serif text-4xl font-bold">Eventi e sala privata</h2>
            <p className="mt-4 text-lg text-crema/80">
              Compleanni, comunioni, lauree, cene aziendali e banchetti: una sala riservata e menù su misura per festeggiare con chi ami.
            </p>
            <Link href="/eventi" className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-oro px-6 font-semibold text-lava hover:bg-oro-light">
              Richiedi un preventivo <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 text-sm">
            {["Sala interna", "Posti all'aperto", "Sala privata", "Bar e carta dei vini", "Wi-Fi gratuito", "Accessibile in sedia a rotelle", "Animali ammessi", "Carte e pagamenti mobile"].map((s) => (
              <li key={s} className="rounded-2xl bg-white px-4 py-3 font-medium ring-1 ring-lava/5">{s}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* DOVE SIAMO */}
      <section className="bg-farina py-20" aria-labelledby="dove">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brace-dark">Dove siamo</p>
            <h2 id="dove" className="mt-2 font-serif text-4xl font-bold">Ti aspettiamo a Nicolosi</h2>
            <p className="mt-4 flex items-start gap-2 text-lg">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-brace" aria-hidden="true" /> {fullAddress}
            </p>
            <a href={telHref(settings.phone)} className="mt-2 inline-flex items-center gap-2 text-lg font-semibold text-brace-dark">
              <Phone className="h-5 w-5" aria-hidden="true" /> {settings.phone}
            </a>
            <div className="mt-8 rounded-3xl bg-white p-6 ring-1 ring-lava/5">
              <h3 className="mb-3 font-serif text-xl font-bold">Orari</h3>
              <HoursTable hours={hours} />
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl ring-1 ring-lava/10">
            <LocationMap className="h-full min-h-96" />
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(restaurantJsonLd(settings, hours))} />
    </>
  );
}
