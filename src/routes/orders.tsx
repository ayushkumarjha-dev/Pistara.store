import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PackageOpen } from "lucide-react";
import { useEffect } from "react";
import { apiGet, type ApiOrder } from "@/lib/api-client";
import { formatINR } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shop/StatusBadge";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "My Orders | Pistara" },
      { name: "description", content: "Track your Pistara orders." },
      { property: "og:title", content: "My Orders | Pistara" },
      { property: "og:description", content: "Track your Pistara orders." },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login", search: { redirect: "/orders" }, replace: true });
  }, [user, authLoading, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => apiGet<{ orders: ApiOrder[] }>("/api/orders"),
    enabled: !!user,
    retry: 1,
  });

  if (!user) return null;

  return (
    <div className="container-page section-y max-w-4xl">
      <h1 className="font-display text-4xl font-extrabold text-primary-deep">
        My <span className="accent-serif text-primary">Orders</span>
      </h1>

      {isLoading ? (
        <div className="mt-10 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border bg-card" />
          ))}
        </div>
      ) : !data || data.orders.length === 0 ? (
        <div className="mt-16 flex flex-col items-center rounded-3xl border bg-card p-12 text-center">
          <PackageOpen className="size-12 text-muted-foreground" />
          <p className="mt-4 font-display text-lg font-semibold text-primary-deep">No orders yet</p>
          <Button asChild className="mt-6">
            <Link to="/shop" search={{}}>{t("shopNow")}</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {data.orders.map((o) => (
            <li key={o.id}>
              <Link
                to="/orders/$id"
                params={{ id: o.id }}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div>
                  <p className="font-display font-bold text-primary-deep">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {o.items?.length ?? 0} item{(o.items?.length ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={o.status} />
                  <span className="font-display text-lg font-bold text-primary-deep">{formatINR(o.total)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
