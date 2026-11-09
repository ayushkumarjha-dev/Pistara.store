import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  ApiError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  type ApiProduct,
} from "@/lib/api-client";
import { formatINR, getCategories } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/products")({
  head: () => ({
    meta: [{ title: "Products | Pistara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminProducts,
});

interface VariantForm {
  id?: string;
  label: "250g" | "500g" | "1kg";
  weightGrams: string;
  price: string;
  mrp: string;
  stock: string;
  isActive: boolean;
}

interface ProductForm {
  name: string;
  nameHi: string;
  categoryId: string;
  description: string;
  descriptionHi: string;
  benefits: string;
  rating: string;
  reviewCount: string;
  images: string;
  isFeatured: boolean;
  isActive: boolean;
  variants: VariantForm[];
}

const GRAMS: Record<"250g" | "500g" | "1kg", number> = { "250g": 250, "500g": 500, "1kg": 1000 };

const emptyForm = (categoryId: string): ProductForm => ({
  name: "",
  nameHi: "",
  categoryId,
  description: "",
  descriptionHi: "",
  benefits: "",
  rating: "4.8",
  reviewCount: "0",
  images: "",
  isFeatured: false,
  isActive: true,
  variants: (["250g", "500g", "1kg"] as const).map((label) => ({
    label,
    weightGrams: String(GRAMS[label]),
    price: "",
    mrp: "",
    stock: "0",
    isActive: true,
  })),
});

function toForm(p: ApiProduct): ProductForm {
  return {
    name: p.name,
    nameHi: p.nameHi,
    categoryId: p.categoryId,
    description: p.description,
    descriptionHi: p.descriptionHi,
    benefits: p.benefits,
    rating: String(p.rating),
    reviewCount: String(p.reviewCount),
    images: p.images.map((i) => i.url).join("\n"),
    isFeatured: p.isFeatured,
    isActive: p.isActive,
    variants: p.variants.map((v) => ({
      id: v.id,
      label: v.label,
      weightGrams: String(v.weightGrams),
      price: String(v.price),
      mrp: String(v.mrp),
      stock: String(v.stock),
      isActive: v.isActive,
    })),
  };
}

function payload(f: ProductForm) {
  return {
    name: f.name,
    nameHi: f.nameHi,
    categoryId: f.categoryId,
    description: f.description,
    descriptionHi: f.descriptionHi,
    benefits: f.benefits,
    rating: Number(f.rating) || 0,
    reviewCount: Number(f.reviewCount) || 0,
    isFeatured: f.isFeatured,
    isActive: f.isActive,
    images: f.images
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((url, i) => ({ url, sortOrder: i, isPrimary: i === 0 })),
    // Rows with no price are still being edited (or left blank) — skip them
    // so a partially filled variant list still submits. MRP falls back to the
    // selling price when left empty.
    variants: f.variants
      .filter((v) => Number(v.price) > 0)
      .map((v) => ({
        ...(v.id ? { id: v.id } : {}),
        label: v.label,
        weightGrams: Number(v.weightGrams),
        price: Number(v.price),
        mrp: Number(v.mrp) || Number(v.price),
        stock: Number(v.stock),
        isActive: v.isActive,
      })),
  };
}

function AdminProducts() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const productsQ = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => apiGet<{ products: ApiProduct[] }>("/api/admin/products"),
    retry: 1,
  });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: getCategories, retry: 1 });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const save = useMutation({
    mutationFn: (f: ProductForm) =>
      editingId
        ? apiPut(`/api/admin/products/${editingId}`, payload(f))
        : apiPost("/api/admin/products", payload(f)),
    onSuccess: () => {
      toast.success(editingId ? "Product updated" : "Product created");
      setEditing(null);
      setEditingId(null);
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Save failed"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/api/admin/products/${id}`),
    onSuccess: () => {
      toast.success("Product deleted");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Delete failed"),
  });

  const toggleActive = useMutation({
    mutationFn: (p: ApiProduct) =>
      apiPatch(`/api/admin/products/${p.id}`, { isActive: !p.isActive }),
    onSuccess: invalidate,
    onError: () => toast.error("Update failed"),
  });

  const inputCls =
    "h-10 w-full rounded-xl border bg-cream px-3 text-sm outline-none focus:border-primary";
  const catName = (id: string) => catsQ.data?.find((c) => c.id === id)?.name ?? "—";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-primary-deep">Products</h2>
        <Button
          onClick={() => {
            setEditingId(null);
            setEditing(emptyForm(catsQ.data?.[0]?.id ?? ""));
          }}
        >
          <Plus /> New product
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-4">Product</th>
              <th className="p-4">Category</th>
              <th className="p-4">From</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Active</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {(productsQ.data?.products ?? []).map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {p.images[0] && (
                      <img
                        src={p.images[0].url}
                        alt=""
                        className="size-10 rounded-lg object-cover"
                      />
                    )}
                    <div>
                      <p className="font-display font-semibold text-primary-deep">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">{catName(p.categoryId)}</td>
                <td className="p-4">
                  {p.variants.length ? formatINR(Math.min(...p.variants.map((v) => v.price))) : "—"}
                </td>
                <td className="p-4">{p.variants.reduce((s, v) => s + v.stock, 0)}</td>
                <td className="p-4">
                  <button
                    onClick={() => toggleActive.mutate(p)}
                    aria-pressed={p.isActive}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      p.isActive ? "bg-primary" : "bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 size-5 rounded-full bg-card transition-all",
                        p.isActive ? "left-[1.375rem]" : "left-0.5",
                      )}
                    />
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <button
                      className="grid size-9 place-items-center rounded-lg hover:bg-sage"
                      aria-label={`Edit ${p.name}`}
                      onClick={() => {
                        setEditingId(p.id);
                        setEditing(toForm(p));
                      }}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      className="grid size-9 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                      aria-label={`Delete ${p.name}`}
                      onClick={() => {
                        if (window.confirm(`Delete ${p.name}? This cannot be undone.`))
                          remove.mutate(p.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {productsQ.data?.products.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No products yet.</p>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-primary-deep/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Product editor"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border bg-card p-6 shadow-lift">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-primary-deep">
                {editingId ? "Edit product" : "New product"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="grid size-9 place-items-center rounded-full hover:bg-sage"
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(editing);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium" htmlFor="f-name">
                    Name (EN)
                  </label>
                  <input
                    id="f-name"
                    required
                    minLength={2}
                    className={inputCls}
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="f-nameHi">
                    Name (HI)
                  </label>
                  <input
                    id="f-nameHi"
                    className={inputCls}
                    value={editing.nameHi}
                    onChange={(e) => setEditing({ ...editing, nameHi: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium" htmlFor="f-cat">
                    Category
                  </label>
                  <select
                    id="f-cat"
                    required
                    className={inputCls}
                    value={editing.categoryId}
                    onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                  >
                    {(catsQ.data ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm font-medium" htmlFor="f-rating">
                      Rating
                    </label>
                    <input
                      id="f-rating"
                      type="number"
                      step="0.1"
                      min={0}
                      max={5}
                      className={inputCls}
                      value={editing.rating}
                      onChange={(e) => setEditing({ ...editing, rating: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium" htmlFor="f-reviews">
                      Reviews
                    </label>
                    <input
                      id="f-reviews"
                      type="number"
                      min={0}
                      className={inputCls}
                      value={editing.reviewCount}
                      onChange={(e) => setEditing({ ...editing, reviewCount: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-end gap-6 pb-1 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.isFeatured}
                      onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })}
                    />{" "}
                    Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.isActive}
                      onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })}
                    />{" "}
                    Active
                  </label>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="f-desc">
                  Description (EN)
                </label>
                <textarea
                  id="f-desc"
                  rows={2}
                  className="mt-1 w-full rounded-xl border bg-cream px-3 py-2 text-sm outline-none focus:border-primary"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="f-descHi">
                  Description (HI)
                </label>
                <textarea
                  id="f-descHi"
                  rows={2}
                  className="mt-1 w-full rounded-xl border bg-cream px-3 py-2 text-sm outline-none focus:border-primary"
                  value={editing.descriptionHi}
                  onChange={(e) => setEditing({ ...editing, descriptionHi: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="f-benefits">
                  Benefits
                </label>
                <textarea
                  id="f-benefits"
                  rows={2}
                  className="mt-1 w-full rounded-xl border bg-cream px-3 py-2 text-sm outline-none focus:border-primary"
                  value={editing.benefits}
                  onChange={(e) => setEditing({ ...editing, benefits: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="f-images">
                  Image URLs (one per line, first is primary)
                </label>
                <textarea
                  id="f-images"
                  rows={2}
                  className="mt-1 w-full rounded-xl border bg-cream px-3 py-2 font-mono text-xs outline-none focus:border-primary"
                  value={editing.images}
                  onChange={(e) => setEditing({ ...editing, images: e.target.value })}
                />
              </div>

              <div>
                <p className="text-sm font-medium">Variants</p>
                <div className="mt-2 space-y-2">
                  {editing.variants.map((v, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[70px_1fr_1fr_1fr_auto] items-center gap-2 rounded-xl border bg-cream p-2"
                    >
                      <span className="px-2 font-display text-sm font-bold text-primary-deep">
                        {v.label}
                      </span>
                      <input
                        aria-label="Price"
                        type="number"
                        min={1}
                        className="h-9 rounded-lg border bg-card px-2 text-sm"
                        placeholder="Price"
                        value={v.price}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            variants: editing.variants.map((x, j) =>
                              j === i ? { ...x, price: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <input
                        aria-label="MRP"
                        type="number"
                        min={1}
                        className="h-9 rounded-lg border bg-card px-2 text-sm"
                        placeholder="MRP"
                        value={v.mrp}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            variants: editing.variants.map((x, j) =>
                              j === i ? { ...x, mrp: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <input
                        aria-label="Stock"
                        required
                        type="number"
                        min={0}
                        className="h-9 rounded-lg border bg-card px-2 text-sm"
                        placeholder="Stock"
                        value={v.stock}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            variants: editing.variants.map((x, j) =>
                              j === i ? { ...x, stock: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={v.isActive}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              variants: editing.variants.map((x, j) =>
                                j === i ? { ...x, isActive: e.target.checked } : x,
                              ),
                            })
                          }
                        />{" "}
                        On
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending && <Loader2 className="animate-spin" />} Save product
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
