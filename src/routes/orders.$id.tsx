import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { ApiError, apiGet, apiPost, type ApiHistoryRow, type ApiOrder, type ApiOrderItem, type OrderStatus } from "@/lib/api-client";
import { formatINR } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { StatusBadge, STATUS_LABELS } from "@/components/shop/StatusBadge";
import { WhatsAppIcon } from "@/components/shop/brand";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({
    meta: [
      { title: "Order Details | Pistara" },
      { name: "description", content: "Track your Pistara order." },
      { property: "og:title", content: "Order Details | Pistara" },
      { property: "og:description", content: "Track your Pistara order." },
    ],
  }),
  component: OrderDetailPage,
});

const STEPS: OrderStatus[] = ["PENDING", "PAYMENT_CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

interface OrderDetail {
  order: ApiOrder;
  items: ApiOrderItem[];
  history: ApiHistoryRow[];
}

function OrderDetailPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const { whatsapp } = useSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { redirect: `/orders/${id}` }, replace: true });
  }, [user, authLoading, id, navigate]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", id],
    queryFn: () => apiGet<OrderDetail>(`/api/orders/${id}`),
    enabled: !!user,
    retry: 1,
  });

  const cancel = useMutation({
    mutationFn: () => apiPost<{ order: ApiOrder }>(`/api/orders/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not cancel order"),
  });

  if (!user) return null;
  if (isLoading) {
    return <div className="container-page section-y max-w-3xl"><div className="h-64 animate-pulse rounded-3xl border bg-card" /></div>;
  }
  if (isError || !data) {
    return (
      <div className="container-page section-y text-center">
        <h1 className="font-display text-3xl font-bold text-primary-deep">Order not found</h1>
        <Button asChild className="mt-6"><Link to="/orders">Back to orders</Link></Button>
      </div>
    );
  }

  const { order, items, history } = data;
  const stepIdx = order.status === "CANCELLED" ? -1 : STEPS.indexOf(order.status);
  const waText = encodeURIComponent(`Namaste Pistara! Query about my order ${order.orderNumber}.`);

  return (
    <div className="container-page section-y max-w-3xl">
      <Button variant="ghost" asChild>
        <Link to="/orders"><ArrowLeft /> All orders</Link>
      </Button>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-primary-deep">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      {order.status !== "CANCELLED" ? (
        <ol className="mt-10 flex items-center">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                {i <= stepIdx ? (
                  <CheckCircle2 className="size-6 text-success" />
                ) : (
                  <Circle className="size-6 text-muted-foreground/40" />
                )}
                <span className={cn("max-w-16 text-center text-[0.6rem] font-medium leading-tight", i <= stepIdx ? "text-primary-deep" : "text-muted-foreground/60")}>
                  {STATUS_LABELS[s]}
                </span>
              </div>
              {i < STEPS.length - 1 && <div className={cn("mx-1 mb-5 h-0.5 flex-1", i < stepIdx ? "bg-success" : "bg-border")} />}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-8 rounded-2xl bg-destructive/10 px-5 py-3 text-sm text-destructive">This order was cancelled.</p>
      )}

      {/* Tracking */}
      {order.trackingUrl && (
        <p className="mt-6 rounded-2xl border bg-card px-5 py-3 text-sm">
          Shipped via {order.courierName ?? "courier"}
          {order.trackingId && <> · tracking <b>{order.trackingId}</b></>} —{" "}
          <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">Track package</a>
        </p>
      )}

      {/* Items */}
      <ul className="mt-10 space-y-3">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-4 rounded-2xl border bg-card p-4">
            {it.imageUrl && <img src={it.imageUrl} alt="" className="size-16 rounded-xl object-cover" />}
            <div className="flex-1">
              <p className="font-display font-semibold text-primary-deep">{it.productName}</p>
              <p className="text-xs text-muted-foreground">{it.variantLabel} × {it.quantity}</p>
            </div>
            <span className="font-display font-bold text-primary-deep">{formatINR(it.lineTotal)}</span>
          </li>
        ))}
      </ul>

      {/* Totals */}
      <dl className="mt-6 space-y-2 rounded-2xl border bg-card p-5 text-sm">
        <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted-foreground">Delivery</dt><dd>{formatINR(order.deliveryCharge)}</dd></div>
        <div className="flex justify-between border-t pt-2 font-display text-lg font-bold text-primary-deep">
          <dt>Total</dt><dd>{formatINR(order.total)}</dd>
        </div>
      </dl>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6 rounded-2xl border bg-card p-5">
          <h2 className="font-display text-sm font-bold text-primary-deep">Updates</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {history.map((h) => (
              <li key={h.id} className="flex justify-between gap-4">
                <span>
                  <b className="text-foreground">{STATUS_LABELS[h.status as OrderStatus] ?? h.status}</b>
                  {h.note ? ` — ${h.note}` : ""}
                </span>
                <span className="shrink-0 text-xs">{new Date(h.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="whatsapp" asChild>
          <a href={`https://wa.me/${whatsapp}?text=${waText}`} target="_blank" rel="noreferrer">
            <WhatsAppIcon className="size-4" /> Ask about this order
          </a>
        </Button>
        {order.status === "PENDING" && (
          <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            {cancel.isPending && <Loader2 className="animate-spin" />} Cancel order
          </Button>
        )}
      </div>
    </div>
  );
}
