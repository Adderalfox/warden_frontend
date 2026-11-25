import type { Limits } from "./metrics-api";
import type { RefLine } from "@/components/metrics/time-series-chart";

/** Request/limit reference lines: one per distinct value (or just the max if the pods differ a lot). */
export function buildRefs(
  limits: Record<string, Limits>,
  pods: string[],
  key: keyof Limits,
  kind: "limit" | "request",
  fmt: (v: number) => string
): RefLine[] {
  const vals = Array.from(
    new Set(pods.map((p) => limits[p]?.[key]).filter((v): v is number => v != null && v > 0))
  ).sort((a, b) => a - b);
  const use = vals.length > 3 ? [vals[vals.length - 1]] : vals;
  return use.map((y) => ({ y, kind, label: `${kind} ${fmt(y)}` }));
}

export const hasAnyData = (m?: Record<string, (number | null)[]>) =>
  !!m && Object.values(m).some((vals) => vals.some((v) => v != null));
