import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/data";
import { fullAddress, SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Termini e condizioni di vendita", alternates: { canonical: "/termini" } };

export default async function TermsPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Termini e condizioni di vendita" updated="settembre 2026">
      <h2>1. Venditore</h2>
      <p>{SITE.name}, {fullAddress}.</p>
      <h2>2. Ordini</h2>
      <p>L&apos;ordine si considera accettato quando il locale lo conferma (stato “Accettato”) indicando l&apos;orario previsto. Il locale può rifiutare un ordine (ad esempio per indisponibilità di prodotti o sovraccarico): in tal caso non è dovuto alcun pagamento.</p>
      <h2>3. Prezzi e pagamento</h2>
      <p>I prezzi sono in euro, IVA inclusa. Il totale è sempre ricalcolato dal nostro sistema al momento dell&apos;ordine. Il pagamento avviene alla consegna o al ritiro, in contanti o con carta tramite POS: sul sito non viene richiesto alcun pagamento. Lo scontrino fiscale viene emesso dal locale e consegnato insieme all&apos;ordine.</p>
      <h2>4. Consegna</h2>
      <p>La consegna è disponibile nelle zone indicate al checkout, con costo e ordine minimo variabili per zona. Gli orari sono indicativi e possono variare per traffico o condizioni meteo.</p>
      <h2>5. Diritto di recesso</h2>
      <p>Ai sensi dell&apos;art. 59, comma 1, lett. d) del Codice del Consumo (D.Lgs. 206/2005), il diritto di recesso è escluso per i beni che rischiano di deteriorarsi o scadere rapidamente, come i prodotti alimentari preparati su ordinazione.</p>
      <h2>6. Annullamento</h2>
      <p>Puoi chiedere di annullare l&apos;ordine telefonando al {s.phone} prima che entri in preparazione.</p>
      <h2>7. Allergeni</h2>
      <p>Le informazioni sugli allergeni sono disponibili nel menù e nell&apos;informativa allergeni. In caso di allergie gravi contattaci prima di ordinare: nella nostra cucina possono esserci contaminazioni crociate.</p>
      <h2>8. Reclami e foro</h2>
      <p>Per reclami scrivi a {s.email}. Per le controversie con i consumatori è competente il foro del luogo di residenza del consumatore. Piattaforma ODR: ec.europa.eu/consumers/odr.</p>
    </LegalPage>
  );
}
