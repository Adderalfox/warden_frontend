"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePolling } from "@/hooks/use-polling";
import { getOverview, type Overview } from "@/lib/analytics-api";
import { getStatus } from "@/lib/metrics-api";
import { useAuth } from "./auth-context";

export interface Prefs {
  range: string;
  refreshMs: number;
}
const DEFAULT_PREFS: Prefs = { range: "1h", refreshMs: 10000 };

interface WorkspaceCtx {
  namespace: string;
  setNamespace: (ns: string) => void;
  ready: boolean;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  overview: Overview | null;
  overviewError: string | null;
  reloadOverview: () => void;
}

const Ctx = createContext<WorkspaceCtx | null>(null);
export const useWorkspace = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkspace outside WorkspaceProvider");
  return v;
};

const NS_KEY = "warden:namespace";

export default function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const prefsKey = `warden:prefs:${user?.id ?? 0}`;
  const [namespace, setNs] = useState<string>("");
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);

  // Pick the namespace once: last used, else "demo" in demo mode, else "default".
  useEffect(() => {
    let cancelled = false;
    const saved = localStorage.getItem(NS_KEY);
    if (saved) {
      setNs((prev) => prev || saved);
      return;
    }
    getStatus()
      .then((s) => !cancelled && setNs((prev) => prev || (s.synthetic ? "demo" : "default")))
      .catch(() => !cancelled && setNs((prev) => prev || "default"));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(prefsKey);
      setPrefsState(raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS);
    } catch {
      setPrefsState(DEFAULT_PREFS);
    }
  }, [prefsKey]);

  const setNamespace = useCallback((ns: string) => {
    setNs(ns);
    try { localStorage.setItem(NS_KEY, ns); } catch { /* private mode */ }
  }, []);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...p };
      try { localStorage.setItem(prefsKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [prefsKey]);

  // One shared poller feeds the sidebar badges, the bell, the demo badge and the Dashboard page.
  const ov = usePolling((s) => getOverview(namespace, s), `overview:${namespace}`, 20000, !!namespace);

  const value = useMemo<WorkspaceCtx>(
    () => ({
      namespace, setNamespace, ready: !!namespace, prefs, setPrefs,
      overview: ov.data, overviewError: ov.error, reloadOverview: ov.reload,
    }),
    [namespace, setNamespace, prefs, setPrefs, ov.data, ov.error, ov.reload]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
