export const PALETTE = [
  "#3ddc97", "#60a5fa", "#f59e0b", "#a78bfa", "#f472b6",
  "#22d3ee", "#fb923c", "#84cc16", "#e879f9", "#94a3b8",
];

export function fmtCpu(m: number | null | undefined): string {
  if (m == null) return "—";
  return m >= 1000 ? `${(m / 1000).toFixed(2)} cores` : `${m.toFixed(m < 10 ? 1 : 0)}m`;
}

export function fmtBytes(b: number | null | undefined, digits = 1): string {
  if (b == null) return "—";
  const units: [string, number][] = [["GiB", 2 ** 30], ["MiB", 2 ** 20], ["KiB", 2 ** 10]];
  for (const [u, d] of units) if (Math.abs(b) >= d) return `${(b / d).toFixed(digits)} ${u}`;
  return `${b.toFixed(0)} B`;
}

export const fmtRate = (bps: number | null | undefined) => (bps == null ? "—" : `${fmtBytes(bps)}/s`);
export const fmtPct = (p: number | null | undefined, digits = 0) => (p == null ? "—" : `${p.toFixed(digits)}%`);
export const fmtInt = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString());

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 90) return `${s}s`;
  if (s < 5400) return `${Math.round(s / 60)}m`;
  if (s < 172800) return `${(s / 3600).toFixed(1)}h`;
  return `${(s / 86400).toFixed(1)}d`;
}

export function fmtAge(createdAtSec: number | null | undefined): string {
  return createdAtSec == null ? "—" : fmtDuration(Date.now() / 1000 - createdAtSec);
}

export function fmtAgo(tsSec: number | null | undefined): string {
  return tsSec == null ? "—" : `${fmtDuration(Date.now() / 1000 - tsSec)} ago`;
}

export function fmtClock(tsMs: number, withSeconds = false): string {
  return new Date(tsMs).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", ...(withSeconds ? { second: "2-digit" } : {}), hour12: false,
  });
}

export function fmtDateTime(tsMs: number): string {
  return new Date(tsMs).toLocaleString([], { hour12: false });
}

/** "checkout-service-6d8f9c7b5-x7k2p" -> "…7b5-x7k2p" for tight legends. */
export function shortPod(name: string, max = 28): string {
  return name.length <= max ? name : `…${name.slice(-(max - 1))}`;
}

export function pctColor(pct: number | null | undefined): string {
  if (pct == null) return "bg-slate-600";
  if (pct >= 90) return "bg-warden-danger";
  if (pct >= 75) return "bg-warden-warn";
  return "bg-warden-accent";
}
