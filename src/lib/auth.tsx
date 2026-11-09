import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { apiGet, apiPost, type ApiAddress, type ApiUser, type MeResponse } from "@/lib/api-client";

interface AuthCtx {
  user: ApiUser | null;
  address: ApiAddress | null;
  isComplete: boolean;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<ApiUser>;
  register: (name: string, email: string, password: string) => Promise<ApiUser>;
  logout: () => Promise<void>;
  refresh: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<MeResponse> => {
      try {
        return await apiGet<MeResponse>("/api/auth/me");
      } catch {
        return { user: null };
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["me"] });

  const loginMut = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiPost<{ user: ApiUser }>("/api/auth/login", input),
    onSuccess: invalidate,
  });
  const registerMut = useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      apiPost<{ user: ApiUser }>("/api/auth/register", input),
    onSuccess: invalidate,
  });
  const logoutMut = useMutation({
    mutationFn: () => apiPost("/api/auth/logout"),
    onSuccess: () => {
      qc.clear();
      // Re-seed `me` as signed out instead of waiting for a refetch: a
      // refetch finishing after logout() resolves would flip `loading` true
      // and back false, re-running guarded-route effects exactly when the
      // caller's post-logout navigation is still committing — the redirect
      // would win again.
      qc.setQueryData<MeResponse>(["me"], { user: null });
    },
  });

  const value: AuthCtx = {
    user: data?.user ?? null,
    address: data?.address ?? null,
    isComplete: data?.isComplete ?? false,
    loading: isLoading,
    isAdmin: data?.user?.role === "admin",
    login: async (email, password) => (await loginMut.mutateAsync({ email, password })).user,
    register: async (name, email, password) =>
      (await registerMut.mutateAsync({ name, email, password })).user,
    logout: async () => {
      // Clears the session, then the caller navigates wherever it wants.
      // Guarded routes see the user disappear and stay put — they detect
      // "signed out here" via their mounted-time user snapshot (see
      // hadUser in the guarded route components).
      await logoutMut.mutateAsync();
    },
    refresh: invalidate,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

/** Redirect helper for guarded pages. Returns true when the page may render. */
export function useRequireAuth(redirectTo?: string) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  if (!loading && !user) {
    void navigate({ to: "/login", search: { redirect: redirectTo } });
    return false;
  }
  return !loading && !!user;
}
