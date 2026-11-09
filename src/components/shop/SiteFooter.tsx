import { Link } from "@tanstack/react-router";
import { Leaf, Mail, MapPin, Phone, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { Logo, WhatsAppIcon } from "./brand";

export function SiteFooter() {
  const { whatsapp, settings } = useSettings();
  return (
    <footer className="grain bg-primary-deep text-primary-foreground">
      <div className="h-px bg-gold/60" />
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-primary-foreground/70">
            Hand-selected dry fruits sourced directly from India's finest farms, cleaned, graded and
            packed fresh for your family.
          </p>
        </div>
        <FooterCol title="Shop">
          <FLink to="/shop">Makhana</FLink>
          <FLink to="/shop">Cashew</FLink>
          <FLink to="/shop">Dried Grapes</FLink>
        </FooterCol>
        <FooterCol title="Quick links">
          <FLink to="/about">Our Story</FLink>
          <FLink to="/contact">Contact</FLink>
          <FLink to="/cart">Cart</FLink>
          <FLink to="/login">Login</FLink>
        </FooterCol>
        <FooterCol title="Contact">
          <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
            <Phone className="size-4 text-gold" /> {settings["contact_phone"] || "+91 98765 43210"}
          </li>
          <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
            <Mail className="size-4 text-gold" /> {settings["contact_email"] || "hello@pistara.in"}
          </li>
          <li className="flex items-center gap-2 text-sm text-primary-foreground/70">
            <MapPin className="size-4 text-gold" />{" "}
            {settings["store_address"] || "Pistara Foods, India"}
          </li>
          <li className="pt-2">
            <Button variant="whatsapp" size="sm" asChild>
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                <WhatsAppIcon className="size-4" /> Chat on WhatsApp
              </a>
            </Button>
          </li>
        </FooterCol>
      </div>
      <div className="container-page flex flex-wrap items-center justify-center gap-x-10 gap-y-3 border-t border-primary-foreground/10 py-6 text-xs text-primary-foreground/70">
        <span className="flex items-center gap-2">
          <Leaf className="size-4 text-gold" /> 100% Natural
        </span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-gold" /> FSSAI Certified
        </span>
        <span className="flex items-center gap-2">
          <Truck className="size-4 text-gold" /> Pan-India Delivery
        </span>
      </div>
      <div className="bg-primary-deep py-4 text-center text-xs text-primary-foreground/50">
        © {new Date().getFullYear()} Pistara Foods. All rights reserved.
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="eyebrow">{title}</h3>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  );
}

function FLink({
  to,
  children,
}: {
  to: "/shop" | "/about" | "/contact" | "/cart" | "/login";
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        className="text-sm text-primary-foreground/70 transition-colors hover:text-gold"
      >
        {children}
      </Link>
    </li>
  );
}
