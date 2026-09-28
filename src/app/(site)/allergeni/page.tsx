import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { ALLERGEN_MAP, ALLERGENS } from "@/lib/allergens";
import { getMenu } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Informativa allergeni", alternates: { canonical: "/allergeni" } };

export default async function AllergensPage() {
  const menu = await getMenu();
  return (
    <LegalPage title="Informativa allergeni" updated="settembre 2026">
      <p>
        Ai sensi del Regolamento UE 1169/2011, indichiamo per ogni piatto la presenza dei 14 allergeni principali. Nella nostra cucina utilizziamo tutti questi ingredienti: non possiamo escludere contaminazioni crociate. In caso di allergie o intolleranze informa sempre il personale.
      </p>
      <h2>I 14 allergeni</h2>
      <ul className="!ml-0 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ALLERGENS.map((a) => (
          <li key={a.code} className="!ml-0 flex list-none items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-lava/5">
            <span className="text-xl" aria-hidden="true">{a.icon}</span> {a.label}
          </li>
        ))}
      </ul>
      <h2>Allergeni per piatto</h2>
      {menu.map((c) => (
        <section key={c.id} className="mt-6">
          <h3 className="font-serif text-xl font-bold">{c.name}</h3>
          <table className="mt-2 w-full text-sm">
            <tbody>
              {c.products.map((p) => (
                <tr key={p.id} className="border-b border-lava/5">
                  <th scope="row" className="py-2 pr-4 text-left font-medium">{p.name}</th>
                  <td className="py-2 text-pietra">
                    {p.allergens.length ? p.allergens.map((a) => `${ALLERGEN_MAP[a]?.icon ?? ""} ${ALLERGEN_MAP[a]?.short ?? a}`).join(", ") : "Nessun allergene dichiarato"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </LegalPage>
  );
}
