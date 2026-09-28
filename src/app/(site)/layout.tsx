import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { MobileCartBar } from "@/components/cart/MobileCartBar";
import { CookieBanner } from "@/components/site/CookieBanner";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { SiteInfoProvider } from "@/components/site/SiteInfo";
import { getPublicInfo } from "@/lib/data";

// dati pubblici (orari, impostazioni) aggiornati al massimo ogni minuto; l'admin forza la rivalidazione
export const revalidate = 60;

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const info = await getPublicInfo();
  return (
    <SiteInfoProvider value={info}>
      <CartProvider>
        <a href="#contenuto" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-oro focus:px-4 focus:py-2 focus:text-lava">
          Vai al contenuto
        </a>
        <Header />
        <main id="contenuto" className={`flex-1 ${info.settings.announcement ? "[--header-h:6.25rem]" : "[--header-h:4rem]"}`}>
          {children}
        </main>
        <Footer settings={info.settings} hours={info.hours} />
        <MobileCartBar />
        <CartDrawer />
        <CookieBanner />
      </CartProvider>
    </SiteInfoProvider>
  );
}
