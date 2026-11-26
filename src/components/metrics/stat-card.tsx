import clsx from "clsx";
import type { ReactNode } from "react";
import { pctColor } from "@/lib/format";

type Tone = "ok" | "warn" | "bad" | "neutral";
const TONE: Record<Tone, string> = {
  ok: "text-warden-accent",
  warn: "text-warden-warn",
  bad: "text-warden-danger",
  neutral: "text-white",
};
const ICON_TONE: Record<Tone, string> = {
  ok: "bg-warden-accent/10 text-warden-accent",
  warn: "bg-warden-warn/10 text-warden-warn",
  bad: "bg-warden-danger/10 text-warden-danger",
  neutral: "bg-white/[0.05] text-slate-400",
};

export function StatCard({
  label, value, sub, tone = "neutral", pct, icon, delta, deltaTone = "ok",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  pct?: number | null; // optional gauge (usage as % of limit)
  icon?: ReactNode;
  delta?: string;
  deltaTone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-warden-border bg-warden-panel px-4 py-3.5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={clsx("text-2xl font-semibold tabular-nums", TONE[tone])}>{value}</span>
            {delta && <span className={clsx("text-xs font-medium", TONE[deltaTone])}>{delta}</span>}
          </div>
        </div>
        {icon && <div className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", ICON_TONE[tone])}>{icon}</div>}
      </div>
      {pct != null && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-warden-bg">
          <div className={clsx("h-full rounded-full", pctColor(pct))} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
        </div>
      )}
      {sub && <div className="mt-1.5 text-xs leading-snug text-slate-500">{sub}</div>}
    </div>
  );
}
