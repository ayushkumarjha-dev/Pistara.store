import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shop/brand";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? s["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Login | Pistara" },
      { name: "description", content: "Sign in to your Pistara account." },
      { property: "og:title", content: "Login | Pistara" },
      { property: "og:description", content: "Sign in to your Pistara account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) navigate({ to: redirect ?? "/profile", replace: true });
  }, [user, loading, redirect, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      toast.success(mode === "login" ? "Welcome back!" : "Account created!");
      navigate({ to: redirect ?? "/profile", replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grain flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-lift">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center font-display text-2xl font-bold text-primary-deep">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Sign in to track orders and check out faster." : "Join Pistara for faster WhatsApp checkout."}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-full bg-sage p-1 text-sm font-semibold">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`rounded-full py-2 transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-primary-deep"}`}
            >
              {m === "login" ? t("login") : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "register" && (
            <div>
              <label htmlFor="name" className="text-sm font-medium">Full name</label>
              <input
                id="name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border bg-cream px-4 text-sm outline-none focus:border-primary"
                placeholder="Asha Verma"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border bg-cream px-4 text-sm outline-none focus:border-primary"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={mode === "register" ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-11 w-full rounded-xl border bg-cream px-4 text-sm outline-none focus:border-primary"
              placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
            />
          </div>
          {error && <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            {mode === "login" ? t("login") : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
