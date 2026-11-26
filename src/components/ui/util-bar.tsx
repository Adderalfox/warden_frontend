import clsx from "clsx";

/** Thin progress bar with a % label. `mode` decides what counts as "bad": high usage vs low availability. */
export function UtilBar({ pct, mode = "usage", empty = "—" }: { pct: number | null | undefined; mode?: "usage" | "availability"; empty?: string }) {
  if (pct == null) return <span className="text-xs text-slate-600">{empty}</span>;
  const color =
    mode === "availability"
      ? pct >= 99.9 ? "bg-warden-accent" : pct >= 60 ? "bg-warden-warn" : "bg-warden-danger"
      : pct >= 90 ? "bg-warden-danger" : pct >= 75 ? "bg-warden-warn" : "bg-warden-accent";
  return (
    <div className="flex min-w-[96px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-warden-bg">
        <div className={clsx("h-full rounded-full", color)} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-slate-400">{pct.toFixed(0)}%</span>
    </div>
  );
}
