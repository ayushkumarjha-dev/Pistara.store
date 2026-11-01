import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, apiGet, apiPatch, type ApiOrder, type OrderStatus } from "@/lib/api-client";
import { formatINR } from "@/lib/api";
import { StatusBadge, STATUS_LABELS } from "@/components/shop/StatusBadge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/orders")({
  validateSearch: (s: Record<string, unknown>): { status?: string | undefined; q?: string | undefined } => ({
    status: typeof s["status"] === "string" ? s["status"] : undefined,
    q: typeof s["q"] === "string" ? s["q"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Orders | Pistara Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminOrders,
});

const STATUSES: OrderStatus[] = ["PENDING", "PAYMENT_CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

function AdminOrders() {
  const { status, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [qInput, setQInput] = useState(q ?? "");

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (q) params.set("q", q);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", status, q],
    queryFn: () => apiGet<{ orders: ApiOrder[]; total: number }>(`/api/admin/orders?${params}`),
    retry: 1,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: OrderStatus }) => apiPatch(`/api/admin/orders/${id}`, { status: next }),
    onSuccess: () => {
      toast.success("Order updated");
      queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Update failed"),
  });

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-primary-deep">Orders</h2>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <form
          className="flex max-w-xs flex-1 items-center gap-2 rounded-full border bg-card px-4"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ search: (old) => ({ ...old, q: qInput || undefined }), replace: true });
          }}
        >
          <Search className="size-4 text-muted-foreground" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Order # or customer"
            className="h-10 flex-1 bg-transparent text-sm outline-none"
            aria-label="Search orders"
          />
        </form>
        <button
          onClick={() => navigate({ search: {}, replace: true })}
          className={cn("rounded-full px-4 py-1.5 text-xs font-semibold", !status ? "bg-primary text-primary-foreground" : "bg-sage text-primary-deep")}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => navigate({ search: { status: s }, replace: true })}
            className={cn("rounded-full px-4 py-1.5 text-xs font-semibold", status === s ? "bg-primary text-primary-foreground" : "bg-sage text-primary-deep")}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl border bg-card" />)}</div>
      ) : (
        <ul className="mt-6 space-y-3">
          {(data?.orders ?? []).map((o) => {
            const open = openId === o.id;
            return (
              <li key={o.id} className="rounded-2xl border bg-card shadow-soft">
                <button className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left" onClick={() => setOpenId(open ? null : o.id)}>
                  <div>
                    <p className="font-display font-semibold text-primary-deep">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.customerName} · {new Date(o.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <span className="font-display font-bold text-primary-deep">{formatINR(o.total)}</span>
                    {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </div>
                </button>
                {open && (
                  <div className="border-t p-4">
                    <ul className="space-y-1 text-sm">
                      {(o.items ?? []).map((it) => (
                        <li key={it.id} className="flex justify-between">
                          <span>{it.productName} · {it.variantLabel} × {it.quantity}</span>
                          <span>{formatINR(it.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Deliver to: {o.customerName}, {o.customerAddress} · {o.customerMobile}
                    </p>
                    {o.adminNote && <p className="mt-1 text-xs text-muted-foreground">Note: {o.adminNote}</p>}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Set status:</span>
                      {STATUSES.filter((s) => s !== o.status).map((s) => (
                        <button
                          key={s}
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: o.id, next: s })}
                          className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-sage"
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {data?.orders.length === 0 && <li className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">No orders in this view.</li>}
        </ul>
      )}
    </div>
  );
}
