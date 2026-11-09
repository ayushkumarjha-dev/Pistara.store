import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { IndianRupee, Package, ShoppingCart, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { apiGet, type ApiOrder } from "@/lib/api-client";
import { formatINR } from "@/lib/api";
import { StatusBadge } from "@/components/shop/StatusBadge";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Dashboard | Pistara Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminDashboard,
});

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  revenue: number;
  totalCustomers: number;
  lowStock: { variantId: string; productName: string; label: string; stock: number }[];
  recentOrders: ApiOrder[];
  series: { date: string; orders: number; revenue: number }[];
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => apiGet<Stats>("/api/admin/stats"),
    retry: 1,
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border bg-card" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Revenue", value: formatINR(data.revenue), icon: IndianRupee },
    { label: "Orders", value: data.totalOrders, icon: ShoppingCart },
    { label: "Pending orders", value: data.pendingOrders, icon: Package },
    { label: "Customers", value: data.totalCustomers, icon: Users },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card p-5 shadow-soft">
            <span className="grid size-10 place-items-center rounded-full bg-sage text-primary">
              <c.icon className="size-5" />
            </span>
            <p className="mt-3 font-display text-2xl font-extrabold text-primary-deep">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {data.lowStock.length > 0 && (
        <div className="rounded-2xl border border-gold/40 bg-gold/10 px-5 py-3 text-sm text-primary-deep">
          <p className="font-semibold">
            {data.lowStock.length} variant{data.lowStock.length === 1 ? "" : "s"} low on stock:
          </p>
          <p className="mt-1 text-muted-foreground">
            {data.lowStock
              .slice(0, 5)
              .map((l) => `${l.productName} ${l.label} (${l.stock})`)
              .join(" · ")}
            {data.lowStock.length > 5 && " …"}
          </p>
          <Link to="/admin/products" className="mt-1 inline-block font-semibold underline">
            Review inventory
          </Link>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-bold text-primary-deep">Sales, last 14 days</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} tickLine={false} tickFormatter={(v: number) => `₹${v}`} />
              <Tooltip formatter={(v) => [formatINR(Number(v)), "Sales"]} />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-bold text-primary-deep">Recent orders</h2>
        <ul className="mt-4 divide-y">
          {data.recentOrders.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <p className="font-display font-semibold text-primary-deep">{o.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {o.customerName} · {new Date(o.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={o.status} />
                <span className="font-semibold">{formatINR(o.total)}</span>
              </div>
            </li>
          ))}
          {data.recentOrders.length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground">No orders yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
