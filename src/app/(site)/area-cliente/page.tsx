import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomerArea } from "@/components/account/CustomerArea";
import { PageHero } from "@/components/site/PageHero";

export const metadata: Metadata = { title: "I miei ordini", robots: { index: false } };

export default function AccountPage() {
  return (
    <>
      <PageHero eyebrow="Area cliente" title="I miei ordini" />
      <div className="bg-farina px-4 py-12 sm:px-6">
        <Suspense fallback={<div className="mx-auto h-48 max-w-2xl animate-pulse rounded-3xl bg-white/70" />}>
          <CustomerArea />
        </Suspense>
      </div>
    </>
  );
}
