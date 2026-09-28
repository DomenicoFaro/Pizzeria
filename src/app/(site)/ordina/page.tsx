import type { Metadata } from "next";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { NotConfigured } from "@/components/site/NotConfigured";
import { OpenBadge } from "@/components/site/OpenBadge";
import { getMenu } from "@/lib/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Ordina online",
  description: "Ordina pizza e brace da RistOro dell'Etna: asporto al locale o consegna a domicilio a Nicolosi e dintorni. Senza commissioni.",
  alternates: { canonical: "/ordina" },
};

export default async function OrderPage() {
  const categories = await getMenu();
  return (
    <>
      <section className="bg-lava-texture pb-8 pt-[calc(var(--header-h)+2rem)] text-crema">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h1 className="font-serif text-4xl font-bold">Ordina da casa</h1>
          <p className="mt-2 text-crema/80">Asporto al locale o consegna a domicilio. Paghi online o alla consegna.</p>
          <div className="mt-4"><OpenBadge /></div>
        </div>
      </section>
      {categories.length ? <MenuBrowser categories={categories} ordering /> : <NotConfigured />}
    </>
  );
}
