import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";
import { getSettings } from "@/lib/data";
import { fullAddress, SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Informativa privacy", alternates: { canonical: "/privacy" } };

export default async function PrivacyPage() {
  const s = await getSettings();
  return (
    <LegalPage title="Informativa privacy" updated="settembre 2026">
      <p>Informativa ai sensi degli artt. 13–14 del Regolamento UE 2016/679 (GDPR).</p>
      <h2>Titolare del trattamento</h2>
      <p>{SITE.name}, {fullAddress}. Email: {s.email} · Tel. {s.phone}.</p>
      <h2>Dati trattati e finalità</h2>
      <ul>
        <li><strong>Ordini online</strong>: nome, cognome, telefono, email, indirizzo di consegna, note e dettagli dell&apos;ordine, per eseguire il contratto di vendita e la consegna (base giuridica: esecuzione di un contratto, art. 6.1.b).</li>
        <li><strong>Prenotazioni e richieste eventi</strong>: dati di contatto per gestire la richiesta (art. 6.1.b).</li>
        <li><strong>Obblighi di legge</strong>: conservazione dei dati fiscali e contabili (art. 6.1.c).</li>
        <li><strong>Marketing</strong> (facoltativo): invio di offerte e novità solo con consenso esplicito, revocabile in qualsiasi momento (art. 6.1.a).</li>
      </ul>
      <h2>Destinatari</h2>
      <p>Fornitori che ci aiutano a erogare il servizio, nominati responsabili del trattamento: hosting (Vercel), database (Supabase), invio email (Resend), mappe e geocodifica (OpenStreetMap/Google). Alcuni fornitori possono trattare dati fuori dall&apos;UE sulla base di clausole contrattuali standard.</p>
      <h2>Conservazione</h2>
      <p>Dati degli ordini: 10 anni per obblighi fiscali. Dati per il marketing: fino alla revoca del consenso. Prenotazioni: 12 mesi.</p>
      <h2>I tuoi diritti</h2>
      <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione, portabilità e opporti al trattamento scrivendo a {s.email}. Hai diritto di proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it).</p>
    </LegalPage>
  );
}
