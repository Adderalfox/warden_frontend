"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMe, logout as apiLogout, type User } from "@/lib/auth-api";
import { UNAUTHORIZED_EVENT } from "@/lib/http";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  authRequired: boolean;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
export const NOAUTH_COOKIE = "warden_noauth";

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

export function loginUrl(): string {
  const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
  return here === "/" || here.startsWith("/login") ? "/login" : `/login?next=${encodeURIComponent(here)}`;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const onLogin = pathname === "/login";

  const refresh = useCallback(async () => {
    try {
      setUserState(await getMe());
    } catch {
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Any API call that comes back 401 => session ended.
  useEffect(() => {
    const h = () => {
      setUserState(null);
      if (!window.location.pathname.startsWith("/login")) router.replace(loginUrl());
    };
    window.addEventListener(UNAUTHORIZED_EVENT, h);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, h);
  }, [router]);

  useEffect(() => {
    if (!loading && !user && !onLogin) router.replace(loginUrl());
  }, [loading, user, onLogin, router]);

  const logout = useCallback(async () => {
    try { await apiLogout(); } catch { /* cookie may already be gone */ }
    document.cookie = `${NOAUTH_COOKIE}=; path=/; max-age=0`;
    setUserState(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo<AuthCtx>(
    () => ({
      user, loading, authRequired: user?.auth_required !== false, refresh,
      setUser: (u) => setUserState((prev) => ({ ...(prev ?? u), ...u })), logout,
    }),
    [user, loading, refresh, logout]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
