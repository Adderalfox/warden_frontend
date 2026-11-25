import clsx from "clsx";
import { pctColor } from "@/lib/format";

type Tone = "ok" | "warn" | "bad" | "neutral";
const TONE: Record<Tone, string> = {
  ok: "text-warden-accent",
  warn: "text-warden-warn",
  bad: "text-warden-danger",
  neutral: "text-white",
};

export function StatCard({
  label, value, sub, tone = "neutral", pct,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  pct?: number | null; // optional gauge (usage as % of limit)
}) {
  return (
    <div className="rounded border border-warden-border bg-warden-panel px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={clsx("mt-1 text-2xl font-semibold tabular-nums", TONE[tone])}>{value}</div>
      {pct != null && (
        <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-warden-bg">
          <div className={clsx("h-full", pctColor(pct))} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
        </div>
      )}
      {sub && <div className="mt-1 truncate text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
