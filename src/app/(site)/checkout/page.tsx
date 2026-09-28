import type { Metadata } from "next";
import { Checkout } from "@/components/checkout/Checkout";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="bg-farina px-4 pb-24 pt-[calc(var(--header-h)+2rem)] sm:px-6">
      <h1 className="mx-auto mb-6 max-w-6xl font-serif text-4xl font-bold">Completa l&apos;ordine</h1>
      <Checkout />
    </div>
  );
}
