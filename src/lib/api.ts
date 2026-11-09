// UI-facing data layer: real API calls, mapped to the shapes the components use.
import { apiGet, type ApiCategory, type ApiProduct } from "@/lib/api-client";
import { testimonials } from "@/data/catalog";

export interface UIVariant {
  id: string;
  label: "250g" | "500g" | "1kg";
  price: number;
  mrp: number;
  stock: number;
  isActive: boolean;
}

export interface UIProduct {
  id: string;
  slug: string;
  name: string;
  nameHi: string;
  category: string; // category slug
  categoryName: string;
  categoryNameHi: string;
  description: string;
  descriptionHi: string;
  images: string[];
  variants: UIVariant[];
  rating: number;
  reviews: number;
  badge?: "Premium" | "Bestseller" | "New";
  featured: boolean;
  fromPrice: number | null;
  totalStock: number;
}

function toUIProduct(p: ApiProduct, cats: ApiCategory[]): UIProduct {
  const cat = cats.find((c) => c.id === p.categoryId);
  const variants = p.variants ?? [];
  const images = p.images ?? [];
  const active = variants.filter((v) => v.isActive);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameHi: p.nameHi || p.name,
    category: p.categorySlug ?? cat?.slug ?? "",
    categoryName: cat?.name ?? "",
    categoryNameHi: cat?.nameHi ?? cat?.name ?? "",
    description: p.description,
    descriptionHi: p.descriptionHi || p.description,
    images: images.map((i) => i.url),
    variants: variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: v.price,
      mrp: v.mrp,
      stock: v.stock,
      isActive: v.isActive,
    })),
    rating: p.rating,
    reviews: p.reviewCount,
    ...(p.isFeatured ? { badge: "Bestseller" as const } : {}),
    featured: p.isFeatured,
    fromPrice: p.fromPrice,
    totalStock: p.totalStock ?? active.reduce((s, v) => s + v.stock, 0),
  };
}

export async function getCategories() {
  const { categories } = await apiGet<{ categories: ApiCategory[] }>("/api/categories");
  return categories;
}

export interface ProductListOptions {
  category?: string | undefined;
  featured?: boolean | undefined;
  q?: string | undefined;
  sort?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  inStock?: boolean | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export async function getProducts(opts: ProductListOptions = {}) {
  const params = new URLSearchParams();
  if (opts.category) params.set("category", opts.category);
  if (opts.q) params.set("q", opts.q);
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.minPrice) params.set("minPrice", String(opts.minPrice));
  if (opts.maxPrice) params.set("maxPrice", String(opts.maxPrice));
  if (opts.inStock) params.set("inStock", "true");
  if (opts.featured) params.set("featured", "true");
  if (opts.page) params.set("page", String(opts.page));
  params.set("limit", String(opts.limit ?? 50));

  const [{ products, total }, categories] = await Promise.all([
    apiGet<{ products: ApiProduct[]; total: number; page: number; limit: number }>(
      `/api/products?${params}`,
    ),
    getCategories(),
  ]);
  return { products: products.map((p) => toUIProduct(p, categories)), total };
}

export async function getProduct(slug: string) {
  const [{ product, related }, categories] = await Promise.all([
    apiGet<{ product: ApiProduct; related: ApiProduct[] }>(
      `/api/products/${encodeURIComponent(slug)}`,
    ),
    getCategories(),
  ]);
  return {
    product: toUIProduct(product, categories),
    related: related.map((p) => toUIProduct(p, categories)),
  };
}

export async function getSettings() {
  const { settings } = await apiGet<{ settings: Record<string, string> }>("/api/settings");
  return settings;
}

// Testimonials are static marketing content (no backend resource in scope).
export async function getTestimonials() {
  return testimonials;
}

export const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const discountPct = (price: number, mrp: number) => Math.round(((mrp - price) / mrp) * 100);

export const DELIVERY_CHARGE_FALLBACK = 50;
