import type { Metadata } from "next";
import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = { title: "Cookie policy", alternates: { canonical: "/cookie" } };

export default function CookiePage() {
  return (
    <LegalPage title="Cookie policy" updated="settembre 2026">
      <p>Questo sito utilizza esclusivamente cookie e strumenti tecnici necessari al suo funzionamento. Non usiamo cookie di profilazione né di terze parti a fini pubblicitari.</p>
      <h2>Strumenti tecnici utilizzati</h2>
      <ul>
        <li><strong>Carrello</strong> (localStorage <code>ristoro-cart-v1</code>): conserva i prodotti scelti sul tuo dispositivo.</li>
        <li><strong>Preferenza cookie</strong> (localStorage <code>ristoro-cookie-consent</code>).</li>
        <li><strong>Accesso</strong> (cookie <code>sb-*</code> di Supabase): solo se accedi all&apos;area cliente o al pannello staff.</li>
      </ul>
      <h2>Mappe</h2>
      <p>La mappa usa le tessere di OpenStreetMap, che non impostano cookie di profilazione.</p>
      <h2>Come gestirli</h2>
      <p>Puoi cancellare cookie e dati del sito dalle impostazioni del browser; il carrello verrà svuotato.</p>
    </LegalPage>
  );
}
