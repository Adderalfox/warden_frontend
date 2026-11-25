"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fetches on mount / key change and then every `intervalMs` (0 = manual only).
 * Keeps showing the previous data while a refresh is in flight, pauses while the
 * tab is hidden, and aborts stale requests.
 */
export function usePolling<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  key: string,
  intervalMs: number,
  enabled = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Different key (namespace, range, ...) => old data no longer applies.
  useEffect(() => {
    setData(null);
    setError(null);
    setUpdatedAt(null);
  }, [key]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let controller: AbortController | null = null;

    const run = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      setLoading(true);
      try {
        const next = await fetcherRef.current(controller.signal);
        if (cancelled) return;
        setData(next);
        setError(null);
        setUpdatedAt(Date.now());
      } catch (e) {
        if (cancelled || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    const timer = intervalMs > 0 ? setInterval(run, intervalMs) : null;
    const onVisible = () => { if (!document.hidden) run(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      controller?.abort();
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [key, intervalMs, enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, updatedAt, reload };
}
