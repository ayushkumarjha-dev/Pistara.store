import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Menu, Package, Search, ShoppingBag, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useI18n, type DictKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Logo } from "./brand";
import { SearchOverlay } from "./SearchOverlay";

const links: { to: "/" | "/shop" | "/about" | "/contact"; key: DictKey }[] = [
  { to: "/", key: "home" },
  { to: "/shop", key: "shop" },
  { to: "/about", key: "about" },
  { to: "/contact", key: "contact" },
];

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const cart = useCart();
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <>
      <div className="bg-primary-deep px-4 py-2 text-center text-xs font-medium tracking-wide text-gold">{t("announce")}</div>
      <header
        className={cn(
          "sticky top-0 z-40 transition-all duration-300",
          scrolled ? "border-b bg-cream/80 shadow-soft backdrop-blur-xl" : "bg-transparent",
        )}
      >
        <div className="container-page flex h-18 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button className="grid size-10 place-items-center rounded-full hover:bg-sage md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu className="size-5" />
            </button>
            <Logo />
          </div>

          <nav className="hidden items-center gap-9 md:flex" aria-label="Main">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className="nav-underline font-display text-sm font-semibold text-foreground/80 transition-colors hover:text-primary data-[status=active]:text-primary-deep"
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button className="grid size-10 place-items-center rounded-full transition-colors hover:bg-sage" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search className="size-5" />
            </button>
            <div className="hidden rounded-full border bg-card p-0.5 text-xs font-semibold sm:flex" role="group" aria-label="Language">
              {(["en", "hi"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={cn("rounded-full px-2.5 py-1 transition-colors", lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {l === "en" ? "EN" : "हिं"}
                </button>
              ))}
            </div>
            <button className="relative grid size-10 place-items-center rounded-full transition-colors hover:bg-sage" onClick={() => cart.setOpen(true)} aria-label={`Cart, ${cart.count} items`}>
              <ShoppingBag className="size-5" />
              <AnimatePresence>
                {cart.count > 0 && (
                  <motion.span
                    key={cart.count}
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-gold px-1 text-[0.65rem] font-bold text-gold-foreground"
                  >
                    {cart.count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="hidden sm:inline-flex">
                    <User /> {user.name.split(" ")[0]}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                    <User /> {t("profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/orders" })}>
                    <Package /> {t("orders")}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                      <LayoutDashboard /> Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logout();
                      navigate({ to: "/" });
                    }}
                  >
                    <LogOut /> {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link to="/login" search={{ redirect: undefined }}>
                  <User /> {t("login")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-80 bg-cream">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="mt-2">
            <Logo />
          </div>
          <nav className="mt-10 flex flex-col gap-1" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                activeOptions={{ exact: l.to === "/" }}
                className="rounded-xl px-4 py-3 font-display text-lg font-semibold data-[status=active]:bg-sage data-[status=active]:text-primary-deep"
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
          <div className="mt-8 flex gap-2">
            {(["en", "hi"] as const).map((l) => (
              <Button key={l} variant={lang === l ? "default" : "outline"} size="sm" onClick={() => setLang(l)}>
                {l === "en" ? "English" : "हिंदी"}
              </Button>
            ))}
          </div>
          {user ? (
            <div className="mt-6 flex flex-col gap-2">
              <Button asChild variant="outline" onClick={() => setMenuOpen(false)}>
                <Link to="/profile">{t("profile")}</Link>
              </Button>
              <Button asChild variant="outline" onClick={() => setMenuOpen(false)}>
                <Link to="/orders">{t("orders")}</Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="outline" onClick={() => setMenuOpen(false)}>
                  <Link to="/admin">Admin</Link>
                </Button>
              )}
              <Button
                onClick={async () => {
                  setMenuOpen(false);
                  await logout();
                  navigate({ to: "/" });
                }}
              >
                {t("logout")}
              </Button>
            </div>
          ) : (
            <Button asChild className="mt-6 w-full" onClick={() => setMenuOpen(false)}>
              <Link to="/login" search={{ redirect: undefined }}>{t("login")}</Link>
            </Button>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
