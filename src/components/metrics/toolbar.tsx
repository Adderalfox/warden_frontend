"use client";

import { fmtDuration } from "@/lib/format";

export const RANGES = ["5m", "15m", "30m", "1h", "3h", "6h", "12h", "24h"];
export const REFRESH_OPTIONS: { label: string; ms: number }[] = [
  { label: "Off", ms: 0 }, { label: "5s", ms: 5000 }, { label: "10s", ms: 10000 },
  { label: "30s", ms: 30000 }, { label: "1m", ms: 60000 },
];

const sel = "rounded border border-warden-border bg-warden-bg px-2 py-1 text-sm text-slate-200 focus:border-warden-accent focus:outline-none";

export function Select({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-500">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={sel}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export default function Toolbar({
  namespace, namespaces, onNamespace,
  service, services, onService,
  range, onRange, refreshMs, onRefreshMs,
  onReload, loading, updatedAt,
}: {
  namespace?: string;
  namespaces?: string[];
  onNamespace?: (v: string) => void;
  service?: string;
  services?: string[];
  onService?: (v: string) => void;
  range: string;
  onRange: (v: string) => void;
  refreshMs: number;
  onRefreshMs: (v: number) => void;
  onReload: () => void;
  loading: boolean;
  updatedAt: number | null;
}) {
  const nsOptions = Array.from(new Set([...(namespaces ?? []), ...(namespace ? [namespace] : [])]));
  return (
    <div className="flex flex-wrap items-center gap-3">
      {namespace !== undefined && onNamespace && (
        <Select label="Namespace" value={namespace} onChange={onNamespace} options={nsOptions.map((n) => ({ value: n, label: n }))} />
      )}
      {onService && (
        <Select
          label="Service" value={service ?? ""} onChange={onService}
          options={[{ value: "", label: "All services" }, ...(services ?? []).map((s) => ({ value: s, label: s }))]}
        />
      )}
      <Select label="Range" value={range} onChange={onRange} options={RANGES.map((r) => ({ value: r, label: `Last ${r}` }))} />
      <Select
        label="Refresh" value={String(refreshMs)} onChange={(v) => onRefreshMs(Number(v))}
        options={REFRESH_OPTIONS.map((o) => ({ value: String(o.ms), label: o.label }))}
      />
      <button
        onClick={onReload}
        className="rounded border border-warden-border px-2.5 py-1 text-sm text-slate-300 hover:border-warden-accent hover:text-white"
      >
        <span className={loading ? "inline-block animate-spin" : "inline-block"}>⟳</span> Refresh
      </button>
      <span className="text-xs text-slate-500">
        {updatedAt ? `updated ${fmtDuration((Date.now() - updatedAt) / 1000)} ago` : loading ? "loading…" : ""}
      </span>
    </div>
  );
}
