import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatINR, getProducts } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const { data } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => getProducts(debounced ? { q: debounced, limit: 8 } : { featured: true, limit: 4 }),
    enabled: open,
    staleTime: 30_000,
    retry: 1,
  });
  const results = data?.products ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[15%] translate-y-0 gap-0 overflow-hidden rounded-3xl bg-cream p-0 sm:max-w-xl">
        <DialogTitle className="sr-only">Search products</DialogTitle>
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <Search className="size-5 text-primary" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="flex-1 bg-transparent font-display text-lg outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul className="max-h-96 overflow-y-auto p-2">
          {results.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">No products match “{q}”.</li>}
          {results.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => {
                  onOpenChange(false);
                  navigate({ to: "/product/$slug", params: { slug: p.slug } });
                }}
                className="flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-colors hover:bg-sage focus-visible:bg-sage"
              >
                <img src={p.images[0]} alt="" className="size-12 rounded-xl object-cover" />
                <span className="flex-1 font-display text-sm font-semibold">{lang === "hi" ? p.nameHi : p.name}</span>
                <span className="text-sm text-muted-foreground">{formatINR(p.fromPrice ?? p.variants[0]?.price ?? 0)}</span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
