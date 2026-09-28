"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, CreditCard, Loader2, MapPin, Pencil, Tag, Wallet } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { ModeToggle } from "@/components/cart/ModeToggle";
import { useSiteInfo } from "@/components/site/SiteInfo";
import { formatEuro } from "@/lib/pricing";
import type { SlotPlan } from "@/lib/schedule";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SITE, fullAddress, telHref } from "@/lib/site";
import type { PaymentMethod } from "@/lib/types";

type Quote = {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  discountLabel: string | null;
  discountError: string | null;
  total: number;
  pizzaCount: number;
  minOrder: number;
  missingForMinimum: number;
  zone: { name: string; description: string | null; fee: number; freeOver: number | null } | null;
  lines: { productId: string; unitPrice: number }[];
};

type Address = { street: string; number: string; city: string; cap: string; intercom: string; floor: string; notes: string };
const EMPTY_ADDRESS: Address = { street: "", number: "", city: "Nicolosi", cap: "95030", intercom: "", floor: "", notes: "" };

const input =
  "h-12 w-full rounded-xl bg-white px-4 text-[16px] ring-1 ring-lava/15 placeholder:text-pietra/60 focus:outline-none focus:ring-2 focus:ring-oro aria-[invalid=true]:ring-brace";
const label = "mb-1.5 block text-sm font-medium";

export function Checkout() {
  const router = useRouter();
  const { lines, mode, hydrated, clear, syncPrices, subtotal: localSubtotal } = useCart();
  const { settings } = useSiteInfo();

  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);
  const [verifiedKey, setVerifiedKey] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [checkingAddress, setCheckingAddress] = useState(false);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [plan, setPlan] = useState<SlotPlan | null>(null);
  const [when, setWhen] = useState<"asap" | "slot">("asap");
  const [dayKey, setDayKey] = useState<string>("");
  const [slot, setSlot] = useState<string>("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>(settings.pay_cash || !settings.pay_pos ? "cash" : "pos");
  const [changeFor, setChangeFor] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [discountCode, setDiscountCode] = useState<string | undefined>();
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; field?: string } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const addressKey = JSON.stringify([address.street.trim(), address.number.trim(), address.city.trim(), address.cap.trim()]);
  const addressVerified = mode === "pickup" || verifiedKey === addressKey;
  const linesPayload = useMemo(
    () => lines.map((l) => ({ productId: l.productId, quantity: l.quantity, modifierIds: l.modifierIds, removed: l.removed, notes: l.notes })),
    [lines],
  );

  // Precompila i dati se il cliente ha fatto l'accesso
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getBrowserSupabase();
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserEmail(data.user.email ?? null);
      setEmail((e) => e || data.user!.email || "");
      const { data: c } = await sb.from("customers").select("id, first_name, last_name, phone").eq("auth_user_id", data.user.id).maybeSingle();
      if (!c) return;
      setFirstName((v) => v || c.first_name || "");
      setLastName((v) => v || c.last_name || "");
      setPhone((v) => v || c.phone || "");
      const { data: addr } = await sb.from("addresses").select("*").eq("customer_id", c.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (addr) setAddress((a) => (a.street ? a : { ...EMPTY_ADDRESS, street: addr.street, number: addr.number ?? "", city: addr.city, cap: addr.cap ?? "", notes: addr.notes ?? "" }));
    });
  }, []);

  // Preventivo dal server (prezzi ricalcolati, zona, sconto)
  const fetchQuote = useCallback(
    async (opts: { withAddress: boolean }) => {
      const body = {
        type: opts.withAddress ? "delivery" : "pickup",
        lines: linesPayload,
        address: opts.withAddress ? address : undefined,
        discountCode,
      };
      const res = await fetch("/api/checkout/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw Object.assign(new Error(data.error ?? "Errore"), { field: data.field });
      return data as Quote;
    },
    [linesPayload, address, discountCode],
  );

  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    let cancelled = false;
    const withAddress = mode === "delivery" && addressVerified;
    fetchQuote({ withAddress })
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
        setQuoteError(null);
        syncPrices(q.lines);
      })
      .catch((e: Error & { field?: string }) => {
        if (cancelled) return;
        if (e.field === "address") {
          setVerifiedKey(null);
          setAddressError(e.message);
        } else setQuoteError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // l'indirizzo viene ricontrollato solo quando è verificato (addressVerified)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, linesPayload, mode, addressVerified, discountCode]);

  // Slot disponibili
  const pizzaCount = quote?.pizzaCount ?? 0;
  const loadSlots = useCallback(async () => {
    const res = await fetch(`/api/slots?type=${mode}&pizzas=${pizzaCount}`, { cache: "no-store" });
    if (!res.ok) return;
    const p = (await res.json()) as SlotPlan;
    setPlan(p);
    if (!p.asap) setWhen("slot");
    const firstDay = p.days.find((d) => d.slots.some((s) => s.available));
    setDayKey((k) => (p.days.some((d) => d.dateKey === k) ? k : (firstDay?.dateKey ?? "")));
  }, [mode, pizzaCount]);

  useEffect(() => {
    if (!hydrated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- caricamento dati dal server
    loadSlots();
    const t = setInterval(loadSlots, 60_000);
    return () => clearInterval(t);
  }, [hydrated, loadSlots]);

  const verifyAddress = async () => {
    setAddressError(null);
    if (!address.street.trim() || !address.number.trim() || !address.city.trim() || !/^\d{5}$/.test(address.cap.trim())) {
      setAddressError("Compila via, civico, comune e CAP (5 cifre).");
      return;
    }
    setCheckingAddress(true);
    try {
      const q = await fetchQuote({ withAddress: true });
      setQuote(q);
      setVerifiedKey(addressKey);
    } catch (e) {
      setAddressError((e as Error).message);
      setVerifiedKey(null);
    } finally {
      setCheckingAddress(false);
    }
  };

  const applyCode = () => {
    const c = codeInput.trim().toUpperCase();
    setDiscountCode(c || undefined);
  };

  const selectedDay = plan?.days.find((d) => d.dateKey === dayKey);
  const deliveryFeeKnown = mode === "pickup" || addressVerified;
  const total = quote ? quote.total : localSubtotal;
  const missing = mode === "delivery" && addressVerified ? (quote?.missingForMinimum ?? 0) : 0;
  const canSubmit =
    !submitting &&
    lines.length > 0 &&
    addressVerified &&
    missing === 0 &&
    !!plan &&
    !plan.paused &&
    (when === "asap" ? !!plan.asap : !!slot) &&
    acceptTerms;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          lines: linesPayload,
          address: mode === "delivery" ? address : undefined,
          discountCode,
          asap: when === "asap",
          slot: when === "slot" ? slot : undefined,
          firstName,
          lastName,
          phone,
          email,
          notes,
          paymentMethod: payment,
          changeFor: payment === "cash" && changeFor ? Number(changeFor.replace(",", ".")) : null,
          acceptTerms,
          marketingConsent: marketing,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError({ message: data.error ?? "Errore", field: data.field });
        if (data.field === "slot") loadSlots();
        setTimeout(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        return;
      }
      clear();
      router.push(`/ordine/${data.id}?nuovo=1`);
    } catch {
      setSubmitError({ message: "Connessione non riuscita. Riprova." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) return <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-3xl bg-white/60" />;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center ring-1 ring-lava/5">
        <p className="text-lg">Il carrello è vuoto.</p>
        <Link href="/ordina" className="mt-5 inline-flex h-12 items-center rounded-full bg-brace px-6 font-semibold text-white">Vai al menù</Link>
      </div>
    );
  }

  const paused = plan?.paused || settings.orders_paused;

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_380px]" noValidate>
      <div className="space-y-6">
        {paused && (
          <div className="flex gap-3 rounded-2xl bg-brace/10 p-4 text-brace ring-1 ring-brace/20" role="alert">
            <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>{settings.pause_message || "Gli ordini online sono momentaneamente sospesi."} Chiamaci al <a className="font-semibold underline" href={telHref(settings.phone)}>{settings.phone}</a>.</p>
          </div>
        )}

        {/* 1. Modalità + indirizzo */}
        <Card step={1} title="Come vuoi ricevere l'ordine?">
          <ModeToggle size="lg" />
          {mode === "pickup" ? (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-crema p-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brace" aria-hidden="true" />
              Ritiro al locale: <strong>{fullAddress}</strong>
            </p>
          ) : addressVerified ? (
            <div className="mt-4 flex items-start justify-between gap-3 rounded-xl bg-basilico/10 p-3 text-sm ring-1 ring-basilico/20">
              <p className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-basilico" aria-hidden="true" />
                <span>
                  <strong>{address.street} {address.number}, {address.city}</strong>
                  {quote?.zone && (
                    <span className="block text-pietra">
                      {quote.zone.name} · consegna {quote.deliveryFee === 0 ? "gratuita" : formatEuro(quote.deliveryFee)} · minimo {formatEuro(quote.minOrder)}
                    </span>
                  )}
                </span>
              </p>
              <button type="button" onClick={() => setVerifiedKey(null)} className="flex h-9 shrink-0 items-center gap-1 rounded-full px-3 font-medium text-brace-dark hover:bg-white">
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Modifica
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-6 gap-3">
              <div className="col-span-4">
                <label htmlFor="street" className={label}>Via / piazza</label>
                <input id="street" autoComplete="address-line1" className={input} value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} placeholder="Via Etnea" />
              </div>
              <div className="col-span-2">
                <label htmlFor="number" className={label}>Civico</label>
                <input id="number" className={input} value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
              </div>
              <div className="col-span-4">
                <label htmlFor="city" className={label}>Comune</label>
                <input id="city" autoComplete="address-level2" className={input} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label htmlFor="cap" className={label}>CAP</label>
                <input id="cap" inputMode="numeric" autoComplete="postal-code" maxLength={5} className={input} value={address.cap} onChange={(e) => setAddress({ ...address, cap: e.target.value })} />
              </div>
              {addressError && (
                <p className="col-span-6 flex gap-2 rounded-xl bg-brace/10 p-3 text-sm text-brace" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {addressError}
                </p>
              )}
              <button type="button" onClick={verifyAddress} disabled={checkingAddress} className="col-span-6 flex h-12 items-center justify-center gap-2 rounded-full bg-lava font-semibold text-crema hover:bg-lava-700 disabled:opacity-60">
                {checkingAddress ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <MapPin className="h-5 w-5" aria-hidden="true" />}
                Verifica indirizzo
              </button>
            </div>
          )}
          {mode === "delivery" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="intercom" className={label}>Citofono</label>
                <input id="intercom" className={input} value={address.intercom} onChange={(e) => setAddress({ ...address, intercom: e.target.value })} />
              </div>
              <div>
                <label htmlFor="floor" className={label}>Scala / piano / interno</label>
                <input id="floor" className={input} value={address.floor} onChange={(e) => setAddress({ ...address, floor: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label htmlFor="rider" className={label}>Note per il rider</label>
                <input id="rider" className={input} value={address.notes} onChange={(e) => setAddress({ ...address, notes: e.target.value })} placeholder="Es. cancello verde, secondo portone" />
              </div>
            </div>
          )}
        </Card>

        {/* 2. Orario */}
        <Card step={2} title="Quando?">
          {!plan ? (
            <div className="h-24 animate-pulse rounded-xl bg-crema" />
          ) : plan.paused ? (
            <p className="text-pietra">Ordini sospesi.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Orario">
                <Choice active={when === "asap"} disabled={!plan.asap} onClick={() => setWhen("asap")}>
                  <Clock className="h-5 w-5" aria-hidden="true" />
                  <span className="text-left leading-tight">
                    Prima possibile
                    <span className="block text-xs font-normal opacity-75">{plan.asap ? `verso le ${plan.asap.label}` : "ora siamo chiusi"}</span>
                  </span>
                </Choice>
                <Choice active={when === "slot"} disabled={plan.days.length === 0} onClick={() => setWhen("slot")}>
                  <Clock className="h-5 w-5" aria-hidden="true" />
                  <span className="text-left leading-tight">
                    Programma
                    <span className="block text-xs font-normal opacity-75">scegli giorno e ora</span>
                  </span>
                </Choice>
              </div>
              {!plan.isOpen && <p className="rounded-xl bg-oro/15 p-3 text-sm">{plan.status.label}. Puoi programmare l&apos;ordine per il prossimo turno.</p>}
              {when === "slot" && (
                <>
                  <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
                    {plan.days.map((d) => (
                      <button
                        key={d.dateKey}
                        type="button"
                        onClick={() => { setDayKey(d.dateKey); setSlot(""); }}
                        className={`h-11 shrink-0 rounded-full px-4 text-sm font-semibold capitalize ring-1 ${dayKey === d.dateKey ? "bg-lava text-crema ring-lava" : "bg-white ring-lava/15"}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {selectedDay ? (
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {selectedDay.slots.map((s) => (
                        <button
                          key={s.iso}
                          type="button"
                          disabled={!s.available}
                          onClick={() => setSlot(s.iso)}
                          aria-pressed={slot === s.iso}
                          className={`h-11 rounded-xl text-sm font-semibold tabular-nums ring-1 transition ${
                            slot === s.iso ? "bg-brace text-white ring-brace" : "bg-white ring-lava/15 hover:ring-lava/40"
                          } disabled:cursor-not-allowed disabled:bg-lava/5 disabled:text-pietra/50 disabled:line-through disabled:ring-0`}
                          title={s.available ? undefined : "Orario al completo"}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-pietra">Nessun orario disponibile nei prossimi giorni.</p>
                  )}
                  <p className="text-xs text-pietra">Gli orari barrati sono al completo: il forno ha una capacità limitata per garantire la qualità.</p>
                </>
              )}
            </div>
          )}
        </Card>

        {/* 3. Dati */}
        <Card step={3} title="I tuoi dati">
          {!userEmail && isSupabaseConfigured && (
            <p className="mb-4 text-sm text-pietra">
              Ordini come ospite. <Link href="/area-cliente?next=/checkout" className="font-semibold text-brace-dark underline underline-offset-2">Accedi</Link> per ritrovare i tuoi ordini e indirizzi.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="fn" className={label}>Nome *</label>
              <input id="fn" required autoComplete="given-name" className={input} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ln" className={label}>Cognome *</label>
              <input id="ln" required autoComplete="family-name" className={input} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div>
              <label htmlFor="ph" className={label}>Telefono *</label>
              <input id="ph" required type="tel" inputMode="tel" autoComplete="tel" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 …" aria-invalid={submitError?.field === "phone"} />
            </div>
            <div>
              <label htmlFor="em" className={label}>Email <span className="font-normal text-pietra">(per la conferma)</span></label>
              <input id="em" type="email" autoComplete="email" className={input} value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={submitError?.field === "email"} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className={label}>Note sull&apos;ordine</label>
              <textarea id="notes" rows={2} className={`${input} h-auto py-3`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Allergie, richieste particolari…" />
            </div>
          </div>
        </Card>

        {/* 4. Pagamento */}
        <Card step={4} title="Pagamento">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Metodo di pagamento">
            {settings.pay_cash && (
              <Choice active={payment === "cash"} onClick={() => setPayment("cash")}>
                <Wallet className="h-5 w-5" aria-hidden="true" />
                <span className="text-left leading-tight">Contanti<span className="block text-xs font-normal opacity-75">{mode === "delivery" ? "alla consegna" : "al ritiro"}</span></span>
              </Choice>
            )}
            {settings.pay_pos && (
              <Choice active={payment === "pos"} onClick={() => setPayment("pos")}>
                <CreditCard className="h-5 w-5" aria-hidden="true" />
                <span className="text-left leading-tight">POS<span className="block text-xs font-normal opacity-75">{mode === "delivery" ? "carta alla consegna" : "carta al ritiro"}</span></span>
              </Choice>
            )}
          </div>
          {payment === "cash" && (
            <div className="mt-4 max-w-xs">
              <label htmlFor="change" className={label}>Ti serve il resto? Paghi con…</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pietra">€</span>
                <input id="change" inputMode="decimal" className={`${input} pl-8`} value={changeFor} onChange={(e) => setChangeFor(e.target.value.replace(/[^\d.,]/g, ""))} placeholder="Es. 50 (lascia vuoto se paghi l'importo esatto)" />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Riepilogo */}
      <aside className="lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:self-start">
        <div className="rounded-3xl bg-white p-5 ring-1 ring-lava/5 sm:p-6">
          <h2 className="font-serif text-2xl font-bold">Riepilogo</h2>
          <ul className="mt-4 divide-y divide-lava/5 text-sm">
            {lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3 py-2">
                <span>
                  <strong>{l.quantity}×</strong> {l.name}
                  {l.modifierLabels.length > 0 && <span className="block text-xs text-pietra">{l.modifierLabels.join(" · ")}</span>}
                </span>
                <span className="shrink-0 tabular-nums">{formatEuro(l.unitPrice * l.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex gap-2">
            <label htmlFor="code" className="sr-only">Codice sconto</label>
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pietra" aria-hidden="true" />
              <input id="code" className={`${input} h-11 pl-9 uppercase`} value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Codice sconto" />
            </div>
            <button type="button" onClick={applyCode} className="h-11 rounded-full bg-lava px-4 text-sm font-semibold text-crema">Applica</button>
          </div>
          {discountCode && quote?.discountError && <p className="mt-2 text-sm text-brace">{quote.discountError}</p>}
          {discountCode && quote && !quote.discountError && quote.discount > 0 && <p className="mt-2 text-sm text-basilico">Codice {discountCode} applicato ({quote.discountLabel})</p>}

          <dl className="mt-4 space-y-1.5 border-t border-lava/10 pt-4 text-sm">
            <Row label="Subtotale" value={formatEuro(quote?.subtotal ?? localSubtotal)} />
            {mode === "delivery" && (
              <Row label="Consegna" value={deliveryFeeKnown && quote ? (quote.deliveryFee === 0 ? "Gratis" : formatEuro(quote.deliveryFee)) : "inserisci l'indirizzo"} />
            )}
            {quote && quote.discount > 0 && <Row label="Sconto" value={`−${formatEuro(quote.discount)}`} className="text-basilico" />}
            <div className="flex justify-between pt-2 text-lg font-bold">
              <dt>Totale</dt>
              <dd className="tabular-nums">{formatEuro(total)}</dd>
            </div>
          </dl>

          {missing > 0 && (
            <p className="mt-3 rounded-xl bg-oro/15 p-3 text-sm font-medium" role="status">
              Mancano <strong>{formatEuro(missing)}</strong> per l&apos;ordine minimo di consegna ({formatEuro(quote!.minOrder)}).{" "}
              <Link href="/ordina" className="underline">Aggiungi qualcosa</Link>
            </p>
          )}
          {quote?.zone?.freeOver != null && quote.deliveryFee > 0 && (
            <p className="mt-2 text-xs text-pietra">Consegna gratuita da {formatEuro(quote.zone.freeOver)}.</p>
          )}
          {quoteError && <p className="mt-3 rounded-xl bg-brace/10 p-3 text-sm text-brace" role="alert">{quoteError}</p>}

          <div className="mt-5 space-y-3 text-sm">
            <label className="flex cursor-pointer gap-3">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brace" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required />
              <span>
                Accetto i <Link href="/termini" target="_blank" className="underline">termini di vendita</Link> e ho letto l&apos;
                <Link href="/privacy" target="_blank" className="underline">informativa privacy</Link> *
              </span>
            </label>
            <label className="flex cursor-pointer gap-3 text-pietra">
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-brace" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
              <span>Voglio ricevere offerte e novità (facoltativo)</span>
            </label>
          </div>

          <div ref={errorRef}>
            {submitError && (
              <p className="mt-4 flex gap-2 rounded-xl bg-brace/10 p-3 text-sm text-brace" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {submitError.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brace text-lg font-semibold text-white shadow-lg shadow-brace/25 transition hover:bg-brace-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {`Conferma ordine · ${formatEuro(total)}`}
          </button>
          {!canSubmit && !submitting && <p className="mt-2 text-center text-xs text-pietra">{hint({ addressVerified, mode, missing, plan, when, slot, acceptTerms })}</p>}
          <p className="mt-3 text-center text-xs text-pietra">
            Problemi? Chiamaci al <a href={telHref(settings.phone)} className="underline">{settings.phone}</a> · {SITE.name}
          </p>
        </div>
      </aside>
    </form>
  );
}

function hint(s: { addressVerified: boolean; mode: string; missing: number; plan: SlotPlan | null; when: string; slot: string; acceptTerms: boolean }) {
  if (s.mode === "delivery" && !s.addressVerified) return "Verifica l'indirizzo di consegna";
  if (s.missing > 0) return "Raggiungi l'ordine minimo";
  if (s.plan?.paused) return "Ordini sospesi";
  if (s.when === "slot" && !s.slot) return "Scegli un orario";
  if (s.when === "asap" && !s.plan?.asap) return "Scegli un orario";
  if (!s.acceptTerms) return "Accetta termini e privacy";
  return "";
}

function Card({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-lava/5 sm:p-6" aria-labelledby={`step-${step}`}>
      <h2 id={`step-${step}`} className="mb-4 flex items-center gap-3 font-serif text-xl font-bold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lava font-sans text-sm text-oro">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Choice({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 py-2 text-sm font-semibold ring-1 transition ${
        active ? "bg-lava text-crema ring-lava" : "bg-white ring-lava/15 hover:ring-lava/40"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`flex justify-between ${className}`}>
      <dt className="text-pietra">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
