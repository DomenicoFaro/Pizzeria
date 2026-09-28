# RistOro dell'Etna — sito con menù e ordini online

Next.js 16 (App Router) · TypeScript · Tailwind 4 · Supabase · Stripe · Resend.

## Avvio in locale

Node.js è installato in `~/.local/node` (il PATH è in `~/.zshrc`; apri un nuovo terminale).

```bash
cp .env.example .env.local   # poi inserisci le chiavi
npm install
npm run dev                  # http://localhost:3000
```

## 1. Supabase

1. **SQL Editor** → incolla ed esegui `supabase/migrations/0001_init.sql` (tabelle, RLS, Realtime, bucket foto `menu`).
2. Poi esegui `supabase/seed.sql` (menù, personalizzazioni, zone, orari, codice `BENVENUTO10`).
3. **Utente titolare**: Authentication → Users → *Add user* (email + password), poi nel SQL Editor:
   ```sql
   insert into staff_members (user_id, role, name)
   select id, 'admin', 'Titolare' from auth.users where email = 'TUA_EMAIL';
   ```
   Per il personale di cassa/cucina usa `role = 'staff'` (vede ordini e prenotazioni, può segnare piatti esauriti e sospendere gli ordini).
4. **Authentication → URL Configuration**: *Site URL* = dominio del sito; aggiungi `https://TUO-DOMINIO/auth/callback` e `http://localhost:3000/auth/callback` ai *Redirect URLs*.
5. (Facoltativo) **Authentication → Providers → Google** per il login clienti con Google.
6. Copia in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (quest'ultima **mai** nel browser).

## 2. Stripe

1. Chiavi di test in `.env.local`: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`.
2. Webhook: Developers → Webhooks → endpoint `https://TUO-DOMINIO/api/stripe/webhook`, eventi `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` → `STRIPE_WEBHOOK_SECRET`.
   In locale: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
   Anche senza webhook la pagina di tracciamento verifica il pagamento direttamente su Stripe.
3. Apple Pay / Google Pay: in produzione registra il dominio in Stripe → Settings → Payment method domains.

Senza chiavi Stripe il pagamento online viene nascosto e restano contanti/POS.

## 3. Email (facoltativo)

`RESEND_API_KEY` + `EMAIL_FROM` con dominio verificato su Resend. `STAFF_NOTIFY_EMAIL` riceve prenotazioni e richieste eventi.

## 4. Deploy su Vercel

Importa il progetto, copia le variabili di `.env.local` (con `NEXT_PUBLIC_SITE_URL=https://ristorodelletna.it`) e collega il dominio.

## Come funziona

| Area | Dove |
|---|---|
| Sito pubblico | `src/app/(site)` — home, menù, ordina, checkout, tracciamento `/ordine/[id]`, prenota, eventi, contatti, pagine legali, area cliente |
| API | `src/app/api` — preventivo, slot, creazione ordine, webhook Stripe |
| Admin | `/admin` — ordini live (kanban, suono, stampa comanda 80 mm), menù, impostazioni, prenotazioni, promozioni, clienti, report + CSV |
| Logica | `src/lib/schedule.ts` (orari/slot/capacità, fuso Europe/Rome), `pricing.ts` (prezzi e personalizzazioni), `orders.ts` (creazione ordine lato server), `zones.ts` |

- **Prezzi ricalcolati sul server**: il client invia solo ID prodotto/personalizzazioni; il totale addebitato da Stripe è quello calcolato in `computeQuote`.
- **Realtime**: il pannello ascolta `orders`; il cliente ascolta `order_tracking` (tabella senza dati personali, aggiornata da trigger).
- **Capacità forno**: le categorie con “conta per la capacità” (le pizze) occupano lo slot; gli slot pieni non sono selezionabili.
- **Chiusura / martedì**: “prima possibile” è disponibile solo a locale aperto; altrimenti si programma per il prossimo turno.

## Da confermare con il ristorante

Tutto modificabile da `/admin` senza toccare il codice:

- Prezzi, ingredienti e allergeni delle pizze speciali, bruschette, cavallo/agnello, dolci e bevande (seed = segnaposto)
- Supplementi (integrale +1,50 €, senza glutine e formato gigante sono **disattivati** finché non confermati)
- Zone, costi, ordini minimi: le zone sono cerchi di 2,5 / 9,5 / 14 km dal locale. Con 14 km anche **Catania centro** rientra in Zona 3: se non volete consegnare lì, riducete il raggio o disegnate un poligono (es. su geojson.io) e incollatelo nella zona
- Telefono principale/WhatsApp, ragione sociale e P.IVA (footer e pagine legali)
- Testi di privacy e termini: da far verificare da un consulente
- Logo e foto reali: carica le foto dei piatti da *Admin → Menù*; finché mancano si vedono illustrazioni segnaposto
