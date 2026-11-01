import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Minus, PackageOpen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, apiPost, type ApiOrder } from "@/lib/api-client";
import { formatINR } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/shop/brand";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart | Pistara" },
      { name: "description", content: "Review your Pistara cart and checkout on WhatsApp." },
      { property: "og:title", content: "Your Cart | Pistara" },
      { property: "og:description", content: "Review your cart and checkout on WhatsApp." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const { user, loading: authLoading } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [placed, setPlaced] = useState<{ order: ApiOrder; whatsappUrl: string } | null>(null);

  const checkout = useMutation({
    mutationFn: () =>
      apiPost<{ order: ApiOrder; whatsappUrl: string }>("/api/orders", {
        items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.qty })),
      }),
    onSuccess: (res) => {
      cart.clear();
      setPlaced(res);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "PROFILE_INCOMPLETE") {
        toast.error("Please complete your profile first", { description: "We need your phone and address for delivery." });
        navigate({ to: "/profile" });
        return;
      }
      toast.error(err instanceof ApiError ? err.message : "Checkout failed. Please try again.");
    },
  });

  if (placed) {
    return (
      <div className="container-page section-y flex flex-col items-center text-center">
        <span className="grid size-20 place-items-center rounded-full bg-success/15 text-success">
          <PackageOpen className="size-10" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold text-primary-deep">Order placed!</h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Your order <b className="text-foreground">{placed.order.orderNumber}</b> of {formatINR(placed.order.total)} is confirmed.
          Send the pre-filled WhatsApp message to complete payment and tracking.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="whatsapp" size="lg" asChild>
            <a href={placed.whatsappUrl} target="_blank" rel="noreferrer">
              <WhatsAppIcon className="size-5" /> Continue on WhatsApp
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/orders">View my orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="container-page section-y flex flex-col items-center text-center">
        <span className="grid size-20 place-items-center rounded-full bg-sage text-primary">
          <PackageOpen className="size-10" />
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold text-primary-deep">Your cart is empty</h1>
        <p className="mt-3 text-muted-foreground">Fill it with something crunchy and wholesome.</p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/shop" search={{}}>{t("shopNow")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-page section-y">
      <h1 className="font-display text-4xl font-extrabold text-primary-deep">
        Your <span className="accent-serif text-primary">Cart</span>
      </h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <ul className="space-y-4">
          {cart.isLoading &&
            Array.from({ length: cart.lines.length }).map((_, i) => (
              <li key={i} className="h-28 animate-pulse rounded-2xl border bg-card" />
            ))}
          {!cart.isLoading &&
            cart.detailed.map(({ line, product, variant }) => (
              <li key={line.variantId} className="flex gap-4 rounded-2xl border bg-card p-4 shadow-soft">
                <Link to="/product/$slug" params={{ slug: product.slug }} className="shrink-0">
                  <img src={product.images[0]} alt="" className="size-24 rounded-xl object-cover" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to="/product/$slug" params={{ slug: product.slug }} className="font-display font-semibold text-primary-deep hover:text-primary">
                        {lang === "hi" ? product.nameHi : product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{variant.label} · {formatINR(variant.price)} each</p>
                    </div>
                    <button onClick={() => cart.remove(line.variantId)} aria-label="Remove item" className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="flex items-center rounded-full border">
                      <button className="grid size-9 place-items-center" onClick={() => cart.setQty(line.variantId, line.qty - 1)} aria-label="Decrease">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-7 text-center text-sm font-bold">{line.qty}</span>
                      <button
                        className="grid size-9 place-items-center disabled:opacity-40"
                        disabled={line.qty >= variant.stock || line.qty >= 20}
                        onClick={() => cart.setQty(line.variantId, line.qty + 1)}
                        aria-label="Increase"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <span className="font-display text-lg font-bold text-primary-deep">{formatINR(variant.price * line.qty)}</span>
                  </div>
                </div>
              </li>
            ))}
        </ul>

        <aside className="h-fit rounded-3xl border bg-card p-6 shadow-soft lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-bold text-primary-deep">Order summary</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("subtotal")}</dt>
              <dd className="font-semibold">{formatINR(cart.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("delivery")}</dt>
              <dd className="font-semibold">{formatINR(cart.delivery)}</dd>
            </div>
            <div className="flex justify-between border-t pt-3 text-base">
              <dt className="font-display font-bold text-primary-deep">{t("total")}</dt>
              <dd className="font-display text-xl font-extrabold text-primary-deep">{formatINR(cart.total)}</dd>
            </div>
          </dl>
          {authLoading ? null : !user ? (
            <Button size="lg" className="mt-6 w-full" asChild>
              <Link to="/login" search={{ redirect: "/cart" }}>Sign in to checkout</Link>
            </Button>
          ) : (
            <Button size="lg" className="mt-6 w-full" disabled={checkout.isPending || cart.isLoading} onClick={() => checkout.mutate()}>
              {checkout.isPending && <Loader2 className="animate-spin" />}
              Place order · WhatsApp
            </Button>
          )}
          <Button variant="ghost" className="mt-2 w-full" asChild>
            <Link to="/shop" search={{}}><ArrowLeft /> Continue shopping</Link>
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Payment is completed on WhatsApp after you place the order.
          </p>
        </aside>
      </div>
    </div>
  );
}
