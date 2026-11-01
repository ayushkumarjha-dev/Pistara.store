import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { formatINR } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";
import { WhatsAppIcon } from "./brand";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const cart = useCart();
  const { t, lang } = useI18n();
  const mobile = useIsMobile();

  return (
    <Sheet open={cart.open} onOpenChange={cart.setOpen}>
      <SheetContent
        side={mobile ? "bottom" : "right"}
        className={cn("flex flex-col gap-0 bg-cream p-0", mobile ? "max-h-[88vh] rounded-t-3xl" : "w-full sm:max-w-md")}
      >
        <SheetHeader className="border-b p-6 text-left">
          <SheetTitle className="font-display text-xl text-primary-deep">{t("cart")}</SheetTitle>
          <SheetDescription>{cart.count} item(s)</SheetDescription>
        </SheetHeader>

        {cart.detailed.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-sage">
              <ShoppingBag className="size-8 text-primary" />
            </span>
            <p className="font-display font-semibold text-primary-deep">{t("emptyCart")}</p>
            <Button asChild onClick={() => cart.setOpen(false)}>
              <Link to="/shop">{t("startShopping")}</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-4 overflow-y-auto p-6">
              {cart.detailed.map(({ line, product, variant }) => (
                <li key={variant.id} className="flex gap-4 rounded-2xl border bg-card p-3">
                  <img src={product.images[0]} alt={product.name} className="size-20 rounded-xl object-cover" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-sm font-semibold">{lang === "hi" ? product.nameHi : product.name}</p>
                      <button
                        onClick={() => cart.remove(variant.id)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={`Remove ${product.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <span className="mt-1 w-fit rounded-full bg-sage px-2 py-0.5 text-[0.7rem] text-primary-deep">{variant.label}</span>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-full border">
                        <button className="grid size-8 place-items-center" onClick={() => cart.setQty(variant.id, line.qty - 1)} aria-label="Decrease">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{line.qty}</span>
                        <button className="grid size-8 place-items-center" onClick={() => cart.setQty(variant.id, line.qty + 1)} aria-label="Increase">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="font-display font-bold text-primary-deep">{formatINR(variant.price * line.qty)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-2 border-t bg-card p-6 text-sm">
              <Row label={t("subtotal")} value={formatINR(cart.subtotal)} />
              <Row label={t("delivery")} value={formatINR(cart.delivery)} />
              <div className="my-2 h-px bg-gold/40" />
              <Row label={t("total")} value={formatINR(cart.total)} strong />
              <Button variant="whatsapp" size="lg" className="mt-3 w-full" asChild onClick={() => cart.setOpen(false)}>
                <Link to="/cart">
                  <WhatsAppIcon className="size-5" /> {t("checkoutWa")}
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between", strong ? "font-display text-base font-bold text-primary-deep" : "text-muted-foreground")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
