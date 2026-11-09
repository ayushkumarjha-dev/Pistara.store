import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package, Settings, ShoppingCart, Users } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin | Pistara" },
      { name: "description", content: "Pistara admin panel." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package, exact: false },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, exact: false },
  { to: "/admin/customers", label: "Customers", icon: Users, exact: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

function AdminLayout() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect anonymous visits to the login page; a signed-out signal on a
  // mount that has seen a user is an explicit logout, and the header's own
  // navigation takes over (see ProfilePage in profile.tsx for the reasoning).
  // The same applies to the non-admin bounce below.
  const hadUser = useRef(false);
  if (user) hadUser.current = true;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      if (hadUser.current) return;
      navigate({ to: "/login", search: { redirect: "/admin" }, replace: true });
    } else if (!isAdmin) navigate({ to: "/", replace: true });
  }, [user, isAdmin, loading, navigate]);

  if (!user || !isAdmin) return null;

  return (
    <div className="container-page section-y">
      <h1 className="font-display text-3xl font-extrabold text-primary-deep">
        Pistara <span className="accent-serif text-primary">Admin</span>
      </h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Admin">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-2.5 font-display text-sm font-semibold text-muted-foreground transition-colors hover:bg-sage hover:text-primary-deep",
              )}
              activeProps={{
                className:
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              }}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
