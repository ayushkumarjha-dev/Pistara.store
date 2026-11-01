import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { formatINR } from "@/lib/api";

export const Route = createFileRoute("/admin/customers")({
  head: () => ({ meta: [{ title: "Customers | Pistara Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminCustomers,
});

interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  createdAt: number;
  city: string | null;
  orderCount: number;
  totalSpent: number;
}

function AdminCustomers() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customers", q],
    queryFn: () => apiGet<{ customers: Customer[]; total: number }>(`/api/admin/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
    retry: 1,
  });

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-primary-deep">Customers</h2>
      <div className="mt-4 flex max-w-sm items-center gap-2 rounded-full border bg-card px-4">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email or mobile"
          className="h-11 flex-1 bg-transparent text-sm outline-none"
          aria-label="Search customers"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border bg-card shadow-soft">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="p-4">Customer</th>
              <th className="p-4">Mobile</th>
              <th className="p-4">City</th>
              <th className="p-4">Orders</th>
              <th className="p-4">Spent</th>
              <th className="p-4">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(data?.customers ?? []).map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-4">
                  <p className="font-display font-semibold text-primary-deep">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.email}</p>
                </td>
                <td className="p-4">{c.mobile ?? "—"}</td>
                <td className="p-4">{c.city ?? "—"}</td>
                <td className="p-4">{c.orderCount}</td>
                <td className="p-4 font-semibold">{formatINR(c.totalSpent)}</td>
                <td className="p-4 text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && data?.customers.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No customers found.</p>}
      </div>
    </div>
  );
}
