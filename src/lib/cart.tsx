import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, getSettings, type UIProduct, type UIVariant } from "@/lib/api";

export interface CartLine {
  variantId: string;
  qty: number;
}

export interface DetailedLine {
  line: CartLine;
  product: UIProduct;
  variant: UIVariant;
}

interface CartCtx {
  lines: CartLine[];
  detailed: DetailedLine[];
  count: number;
  subtotal: number;
  delivery: number;
  total: number;
  open: boolean;
  setOpen: (o: boolean) => void;
  add: (variantId: string, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  isLoading: boolean;
}

// Keep one context instance across hot reloads so provider and consumers always match.
const g = globalThis as { __pistaraCartCtx?: React.Context<CartCtx | null> };
const Ctx = (g.__pistaraCartCtx ??= createContext<CartCtx | null>(null));
const KEY = "pistara-cart-v2";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* ignore corrupt cart */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, loaded]);

  // Live prices and stock come from the API, never from the stored cart.
  const productsQuery = useQuery({
    queryKey: ["products", "cart-resolve"],
    queryFn: () => getProducts({ limit: 50 }),
    staleTime: 30_000,
    retry: 1,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const value = useMemo<CartCtx>(() => {
    const products = productsQuery.data?.products ?? [];
    const detailed = lines.flatMap((line) => {
      for (const product of products) {
        const variant = product.variants.find((v) => v.id === line.variantId);
        if (variant) return [{ line, product, variant }];
      }
      return [];
    });
    const subtotal = detailed.reduce((s, d) => s + d.variant.price * d.line.qty, 0);
    const deliveryCharge = Number(settingsQuery.data?.["delivery_charge"] ?? 50);
    const delivery = detailed.length ? deliveryCharge : 0;
    return {
      lines,
      detailed,
      open,
      setOpen,
      subtotal,
      delivery,
      total: subtotal + delivery,
      count: lines.reduce((s, l) => s + l.qty, 0),
      isLoading: productsQuery.isLoading,
      add: (variantId, qty = 1) =>
        setLines((ls) => {
          const ex = ls.find((l) => l.variantId === variantId);
          return ex
            ? ls.map((l) => (l.variantId === variantId ? { ...l, qty: l.qty + qty } : l))
            : [...ls, { variantId, qty }];
        }),
      setQty: (variantId, qty) =>
        setLines((ls) =>
          qty <= 0
            ? ls.filter((l) => l.variantId !== variantId)
            : ls.map((l) => (l.variantId === variantId ? { ...l, qty } : l)),
        ),
      remove: (variantId) => setLines((ls) => ls.filter((l) => l.variantId !== variantId)),
      clear: () => setLines([]),
    };
  }, [lines, open, productsQuery.data, productsQuery.isLoading, settingsQuery.data]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
