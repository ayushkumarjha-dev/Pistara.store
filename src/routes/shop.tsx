import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { getCategories, getProducts } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ProductCard, ProductCardSkeleton } from "@/components/shop/ProductCard";
import { SectionTitle } from "@/components/shop/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShopSearch = {
  category?: string | undefined;
  q?: string | undefined;
  sort?: string | undefined;
  inStock?: boolean | undefined;
  page?: number | undefined;
};

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): ShopSearch => ({
    category: typeof s["category"] === "string" ? s["category"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    sort: typeof s["sort"] === "string" ? s["sort"] : undefined,
    inStock: s["inStock"] === true || s["inStock"] === "true" ? true : undefined,
    page: typeof s["page"] === "number" ? s["page"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop Dry Fruits | Pistara" },
      {
        name: "description",
        content: "Browse premium makhana, cashews and raisins in 250g, 500g and 1kg packs.",
      },
      { property: "og:title", content: "Shop Dry Fruits | Pistara" },
      { property: "og:description", content: "Browse premium makhana, cashews and raisins." },
    ],
  }),
  component: ShopPage,
});

const SORTS = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "rating", label: "Top Rated" },
  { id: "name", label: "Name A–Z" },
];

const PAGE_SIZE = 12;

function ShopPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/shop" });
  const { t, lang } = useI18n();
  const [qInput, setQInput] = useState(search.q ?? "");

  const setSearch = (patch: Partial<ShopSearch>) =>
    navigate({
      search: (old: ShopSearch) => ({ ...old, page: undefined, ...patch }),
      replace: true,
    });

  const catsQ = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const productsQ = useQuery({
    queryKey: ["products", "shop", search],
    queryFn: () =>
      getProducts({
        category: search.category,
        q: search.q,
        sort: search.sort,
        inStock: search.inStock,
        page: search.page ?? 1,
        limit: PAGE_SIZE,
      }),
    retry: 1,
  });

  const products = productsQ.data?.products ?? [];
  const total = productsQ.data?.total ?? 0;
  const page = search.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="container-page section-y">
      <SectionTitle eyebrow="The catalogue" a={t("shopByCat")} b={t("category")} align="left" />

      {/* Filter bar */}
      <div className="mt-10 flex flex-col gap-4 rounded-3xl border bg-card p-4 shadow-soft md:flex-row md:items-center">
        <form
          className="flex flex-1 items-center gap-2 rounded-full border bg-cream px-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch({ q: qInput || undefined });
          }}
        >
          <Search className="size-4 text-muted-foreground" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder={t("search")}
            className="h-11 flex-1 bg-transparent text-sm outline-none"
            aria-label="Search products"
          />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          {SORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSearch({ sort: s.id === "featured" ? undefined : s.id })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                (search.sort ?? "featured") === s.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-sage",
              )}
            >
              {s.label}
            </button>
          ))}
          <button
            onClick={() => setSearch({ inStock: search.inStock ? undefined : true })}
            aria-pressed={!!search.inStock}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              search.inStock ? "bg-primary text-primary-foreground" : "hover:bg-sage",
            )}
          >
            In stock
          </button>
        </div>
      </div>

      {/* Category chips */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSearch({ category: undefined })}
          className={cn(
            "rounded-full px-4 py-2 font-display text-sm font-semibold transition-colors",
            !search.category
              ? "bg-primary-deep text-primary-foreground"
              : "bg-sage text-primary-deep hover:bg-sage/70",
          )}
        >
          All
        </button>
        {(catsQ.data ?? []).map((c) => (
          <button
            key={c.slug}
            onClick={() => setSearch({ category: c.slug })}
            className={cn(
              "rounded-full px-4 py-2 font-display text-sm font-semibold transition-colors",
              search.category === c.slug
                ? "bg-primary-deep text-primary-foreground"
                : "bg-sage text-primary-deep hover:bg-sage/70",
            )}
          >
            {lang === "hi" ? c.nameHi : c.name}
          </button>
        ))}
      </div>

      {/* Grid */}
      {productsQ.isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : productsQ.isError ? (
        <div className="mt-16 rounded-3xl border bg-card p-12 text-center">
          <p className="font-display text-lg font-semibold text-primary-deep">
            The catalogue could not be loaded
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please check your connection and try again.
          </p>
          <Button className="mt-6" onClick={() => productsQ.refetch()}>
            Retry
          </Button>
        </div>
      ) : products.length === 0 ? (
        <div className="mt-16 rounded-3xl border bg-card p-12 text-center">
          <p className="font-display text-lg font-semibold text-primary-deep">
            Nothing matches those filters
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => navigate({ search: {}, replace: true })}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-12 flex justify-center gap-2">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              onClick={() =>
                navigate({ search: (old: ShopSearch) => ({ ...old, page: i + 1 }), replace: true })
              }
              className={cn(
                "grid size-10 place-items-center rounded-full border font-display text-sm font-semibold",
                page === i + 1 ? "bg-primary text-primary-foreground" : "hover:bg-sage",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
