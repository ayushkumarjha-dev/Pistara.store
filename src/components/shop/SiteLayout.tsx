import type { ReactNode } from "react";
import { useSettings } from "@/lib/settings";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { CartDrawer } from "./CartDrawer";
import { WhatsAppIcon } from "./brand";

export function SiteLayout({ children }: { children: ReactNode }) {
  const { whatsapp } = useSettings();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
      <a
        href={`https://wa.me/${whatsapp}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Pistara on WhatsApp"
        className="animate-wa-pulse fixed bottom-5 right-5 z-40 grid size-14 place-items-center rounded-full bg-whatsapp text-primary-foreground shadow-lift transition-transform hover:scale-105"
      >
        <WhatsAppIcon className="size-7" />
      </a>
    </div>
  );
}
