import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { discountPct, formatINR, type UIProduct } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Stars } from "./brand";

export function ProductCard({ product }: { product: UIProduct }) {
  const { add, setOpen } = useCart();
  const { t, lang } = useI18n();
  const base = product.variants.find((v) => v.isActive) ?? product.variants[0];
  const name = lang === "hi" ? product.nameHi : product.name;
  if (!base) return null;
  const soldOut = product.totalStock <= 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="relative block aspect-square overflow-hidden bg-olive-50">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute inset-0 size-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:opacity-0"
        />
        <img
          src={product.images[1] ?? product.images[0]}
          alt=""
          loading="lazy"
          width={1024}
          height={1024}
          className="absolute inset-0 size-full scale-110 object-cover opacity-0 transition-all duration-700 group-hover:scale-100 group-hover:opacity-100"
        />
        {product.badge && (
          <span className="absolute left-0 top-4 rounded-r-full bg-gold px-3 py-1 font-display text-[0.65rem] font-bold uppercase tracking-widest text-gold-foreground shadow-gold">
            {product.badge}
          </span>
        )}
        {soldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-destructive px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-destructive-foreground">
            Sold out
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="w-fit rounded-full bg-sage px-2.5 py-0.5 text-[0.7rem] font-medium text-primary-deep">
          {lang === "hi" ? product.categoryNameHi : product.categoryName}
        </span>
        <Link to="/product/$slug" params={{ slug: product.slug }} className="font-display text-base font-semibold leading-snug text-foreground hover:text-primary">
          {name}
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Stars value={product.rating} />
          <span>
            {product.rating} ({product.reviews})
          </span>
        </div>
        <div className="mt-auto flex flex-wrap items-baseline gap-2 pt-2">
          <span className="text-xs text-muted-foreground">{t("from")}</span>
          <span className="font-display text-lg font-bold text-primary-deep">{formatINR(product.fromPrice ?? base.price)}</span>
          <span className="text-sm text-muted-foreground line-through">{formatINR(base.mrp)}</span>
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-[0.7rem] font-semibold text-success">
            {discountPct(base.price, base.mrp)}% off
          </span>
        </div>
        <Button
          size="sm"
          disabled={soldOut || !base.isActive}
          className="mt-3 w-full md:pointer-events-none md:translate-y-2 md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100"
          onClick={() => {
            add(base.id);
            toast.success(t("added"), {
              description: `${name} · ${base.label}`,
              action: { label: t("cart"), onClick: () => setOpen(true) },
            });
          }}
        >
          <Plus /> {t("quickAdd")} · {base.label}
        </Button>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="aspect-square animate-pulse bg-olive-50" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-16 animate-pulse rounded-full bg-sage" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
