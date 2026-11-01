import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShieldCheck, Truck, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { discountPct, formatINR, getProduct } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/shop/ProductCard";
import { LeafDivider, Stars } from "@/components/shop/brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$slug")({
  head: () => ({
    meta: [
      { title: "Product | Pistara" },
      { name: "description", content: "Premium dry fruits from Pistara." },
      { property: "og:title", content: "Product | Pistara" },
      { property: "og:description", content: "Premium dry fruits from Pistara." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const cart = useCart();
  const navigate = useNavigate();
  const [imgIdx, setImgIdx] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => getProduct(slug),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="container-page section-y grid gap-10 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-3xl bg-olive-50" />
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container-page section-y text-center">
        <h1 className="font-display text-3xl font-bold text-primary-deep">Product not found</h1>
        <Button asChild className="mt-6">
          <Link to="/shop">Back to shop</Link>
        </Button>
      </div>
    );
  }

  const { product, related } = data;
  const name = lang === "hi" ? product.nameHi : product.name;
  const description = lang === "hi" ? product.descriptionHi : product.description;
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants.find((v) => v.isActive) ?? product.variants[0]!;
  const outOfStock = variant.stock <= 0 || !variant.isActive;

  const addToCart = (thenGoToCart: boolean) => {
    cart.add(variant.id, qty);
    toast.success(t("added"), { description: `${name} · ${variant.label} × ${qty}` });
    if (thenGoToCart) navigate({ to: "/cart" });
    else cart.setOpen(true);
  };

  return (
    <div className="container-page section-y">
      <nav className="text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary">Home</Link> / <Link to="/shop" search={{}} className="hover:text-primary">Shop</Link> /{" "}
        <span className="text-foreground">{name}</span>
      </nav>

      <div className="mt-8 grid gap-12 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="overflow-hidden rounded-3xl border bg-olive-50 shadow-soft">
            <img src={product.images[imgIdx] ?? product.images[0]} alt={name} className="aspect-square w-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="mt-4 flex gap-3">
              {product.images.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => setImgIdx(i)}
                  className={cn(
                    "overflow-hidden rounded-2xl border-2 transition-colors",
                    i === imgIdx ? "border-gold" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                  aria-label={`Image ${i + 1}`}
                >
                  <img src={src} alt="" className="size-20 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <span className="rounded-full bg-sage px-3 py-1 text-xs font-medium text-primary-deep">
            {lang === "hi" ? product.categoryNameHi : product.categoryName}
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold text-primary-deep">{name}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={product.rating} />
            <span>{product.rating} · {product.reviews} reviews</span>
          </div>
          <p className="mt-5 leading-relaxed text-muted-foreground">{description}</p>

          {/* Variant selector */}
          <div className="mt-8">
            <p className="font-display text-sm font-semibold text-primary-deep">Pack size</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  disabled={!v.isActive}
                  className={cn(
                    "rounded-2xl border-2 px-5 py-3 text-left transition-colors",
                    v.id === variant.id ? "border-gold bg-gold/10" : "border-border hover:border-primary/40",
                    !v.isActive && "opacity-40",
                  )}
                >
                  <span className="block font-display text-sm font-bold text-primary-deep">{v.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {formatINR(v.price)} {v.stock <= 5 && v.stock > 0 && <em className="text-destructive not-italic">· only {v.stock} left</em>}
                    {v.stock <= 0 && <em className="text-destructive not-italic">· sold out</em>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-4xl font-extrabold text-primary-deep">{formatINR(variant.price)}</span>
            <span className="text-lg text-muted-foreground line-through">{formatINR(variant.mrp)}</span>
            <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              {discountPct(variant.price, variant.mrp)}% off
            </span>
          </div>

          {/* Qty + actions */}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-full border">
              <button className="grid size-11 place-items-center" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center font-display font-bold">{qty}</span>
              <button
                className="grid size-11 place-items-center"
                onClick={() => setQty((q) => Math.min(20, variant.stock, q + 1))}
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <Button size="lg" disabled={outOfStock} onClick={() => addToCart(false)}>
              {outOfStock ? "Sold out" : t("quickAdd")}
            </Button>
            <Button size="lg" variant="gold" disabled={outOfStock} onClick={() => addToCart(true)}>
              <Zap /> Buy now
            </Button>
          </div>

          <div className="mt-8 grid gap-3 rounded-2xl border bg-card p-5 text-sm text-muted-foreground sm:grid-cols-2">
            <span className="flex items-center gap-2"><Truck className="size-4 text-primary" /> Flat ₹50 delivery · 2–5 days</span>
            <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /> Hygienically packed, FSSAI certified</span>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="text-center font-display text-3xl font-bold text-primary-deep">
            You may also <span className="accent-serif text-primary">love</span>
          </h2>
          <LeafDivider className="mt-4" />
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
