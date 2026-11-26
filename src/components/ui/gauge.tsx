import clsx from "clsx";

/** Ring gauge in the style of the dashboard reference: open ring (270°), big value in the middle. */
export function Gauge({
  value, label, sub, color = "#2fbfae", size = 168,
}: {
  value: number | null;
  label: string;
  sub?: string;
  color?: string;
  size?: number;
}) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-[225deg]">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#14222a" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${arc} ${circ}`} />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(arc * pct) / 100} ${circ}`} style={{ transition: "stroke-dasharray .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={clsx("text-3xl font-semibold tabular-nums text-white")}>{value == null ? "—" : Math.round(value)}</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</div>
        {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}

export const gradeColor = (g?: string) =>
  g === "healthy" ? "#2fbfae" : g === "degraded" ? "#e8c547" : g === "critical" ? "#ef5b6b" : "#64748b";
