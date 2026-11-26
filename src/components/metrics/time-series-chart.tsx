"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { fmtClock, fmtDateTime, PALETTE, shortPod } from "@/lib/format";
import { EmptyState, Panel } from "./panel";

export interface RefLine {
  y: number;
  label: string;
  kind: "limit" | "request" | "threshold";
}

const REF_COLOR: Record<RefLine["kind"], string> = {
  limit: "#ef5b6b",
  request: "#e8c547",
  threshold: "#94a3b8",
};

/** Stable colour per series name so the same pod keeps its colour across panels. */
export function colorFor(names: string[]): Record<string, string> {
  const sorted = [...names].sort();
  return Object.fromEntries(sorted.map((n, i) => [n, PALETTE[i % PALETTE.length]]));
}

interface Props {
  title: string;
  timestamps: number[]; // epoch seconds
  series: Record<string, (number | null)[]>;
  format: (v: number) => string;
  colors: Record<string, string>;
  refs?: RefLine[];
  height?: number;
  stackable?: boolean;
  defaultStacked?: boolean;
  syncId?: string;
  maxY?: number; // fixed upper bound (e.g. 100 for percentages)
  emptyMessage?: string;
  onSeriesClick?: (name: string) => void;
  nameOf?: (name: string) => string;
}

interface TipProps {
  active?: boolean;
  payload?: { dataKey: string; value: number | null; color: string }[];
  label?: number;
}

/** Y-axis tick drawn as plain text so long labels ("563.2 MiB") never wrap. */
function YTick({ x, y, payload, fmt }: { x?: number; y?: number; payload?: { value: number }; fmt: (v: number) => string }) {
  return (
    <text x={(x ?? 0) - 4} y={y} dy={4} textAnchor="end" fontSize={11} fill="#64818b">
      {payload ? fmt(payload.value) : ""}
    </text>
  );
}

export default function TimeSeriesChart({
  title, timestamps, series, format, colors, refs = [], height = 220, stackable = false,
  defaultStacked = false, syncId, maxY, emptyMessage = "No data in this time range.", onSeriesClick,
  nameOf = shortPod,
}: Props) {
  const [stacked, setStacked] = useState(defaultStacked);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const names = useMemo(() => Object.keys(series).sort(), [series]);

  const rows = useMemo(
    () =>
      timestamps.map((t, i) => {
        const row: Record<string, number | null> = { t: t * 1000 };
        for (const n of names) row[n] = series[n]?.[i] ?? null;
        return row;
      }),
    [timestamps, series, names]
  );

  const stats = useMemo(
    () =>
      Object.fromEntries(
        names.map((n) => {
          const vals = (series[n] ?? []).filter((v): v is number => v != null);
          return [
            n,
            vals.length
              ? { last: vals[vals.length - 1], avg: vals.reduce((a, b) => a + b, 0) / vals.length, max: Math.max(...vals) }
              : null,
          ];
        })
      ),
    [names, series]
  );

  const hasData = names.some((n) => stats[n] != null);
  const toggle = (n: string) =>
    setHidden((h) => {
      const next = new Set(h);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });

  const refMax = refs.reduce((m, r) => Math.max(m, r.y), 0);
  const spanSeconds = timestamps.length > 1 ? timestamps[timestamps.length - 1] - timestamps[0] : 0;

  const Tip = ({ active, payload, label }: TipProps) => {
    if (!active || !payload || label == null) return null;
    const items = payload.filter((p) => p.value != null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    if (!items.length) return null;
    return (
      <div className="max-w-xs rounded border border-warden-border bg-warden-bg/95 px-2.5 py-2 text-xs shadow-lg">
        <div className="mb-1 text-slate-400">{fmtDateTime(label)}</div>
        {items.slice(0, 12).map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 truncate text-slate-300">
              <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ background: p.color }} />
              {nameOf(p.dataKey)}
            </span>
            <span className="tabular-nums text-white">{format(p.value as number)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Panel
      title={title}
      right={
        stackable && hasData ? (
          <button
            onClick={() => setStacked((s) => !s)}
            className="rounded-md border border-warden-border px-2 py-0.5 text-[11px] text-slate-400 hover:text-white"
          >
            {stacked ? "stacked" : "lines"}
          </button>
        ) : undefined
      }
    >
      {!hasData ? (
        <div style={{ height }}>
          <EmptyState>{emptyMessage}</EmptyState>
        </div>
      ) : (
        <>
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} syncId={syncId} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#13202a" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]}
                  tickFormatter={(v: number) => fmtClock(v, spanSeconds < 900)}
                  stroke="#2a3a42" tick={{ fontSize: 11, fill: "#64818b" }} minTickGap={48}
                />
                <YAxis
                  width={80} stroke="#2a3a42" tick={<YTick fmt={format} />}
                  allowDecimals
                  domain={[0, maxY ?? ((dataMax: number) => Math.max(dataMax, refMax) * 1.1 || 1)]}
                />
                <Tooltip content={<Tip />} isAnimationActive={false} cursor={{ stroke: "#475569" }} />
                {refs.map((r) => (
                  <ReferenceLine
                    key={`${r.kind}-${r.y}`} y={r.y} stroke={REF_COLOR[r.kind]} strokeDasharray="5 4" strokeOpacity={0.8}
                    label={{ value: r.label, position: "insideTopRight", fill: REF_COLOR[r.kind], fontSize: 10 }}
                  />
                ))}
                {names.filter((n) => !hidden.has(n)).map((n) => (
                  <Area
                    key={n} dataKey={n} name={n} type="monotone" stroke={colors[n]} fill={colors[n]}
                    fillOpacity={stacked ? 0.55 : 0.08} strokeWidth={1.6} dot={false} activeDot={{ r: 3 }}
                    stackId={stacked ? "stack" : undefined} connectNulls={false} isAnimationActive={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Grafana-style legend table */}
          <div className="mt-2 max-h-36 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="text-slate-500">
                <tr>
                  <th className="py-0.5 text-left font-medium">series</th>
                  <th className="px-2 py-0.5 text-right font-medium">last</th>
                  <th className="px-2 py-0.5 text-right font-medium">avg</th>
                  <th className="py-0.5 pl-2 text-right font-medium">max</th>
                </tr>
              </thead>
              <tbody>
                {names.map((n) => {
                  const s = stats[n];
                  return (
                    <tr key={n} className={clsx("hover:bg-warden-bg/60", hidden.has(n) && "opacity-40")}>
                      <td className="max-w-0 py-0.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggle(n)} title="Click to show/hide"
                            className="flex min-w-0 items-center gap-1.5 text-left"
                          >
                            <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ background: colors[n] }} />
                            <span className="truncate text-slate-300">{nameOf(n)}</span>
                          </button>
                          {onSeriesClick && (
                            <button onClick={() => onSeriesClick(n)} title="Open pod" className="text-slate-600 hover:text-warden-accent">↗</button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-0.5 text-right tabular-nums text-slate-200">{s ? format(s.last) : "—"}</td>
                      <td className="px-2 py-0.5 text-right tabular-nums text-slate-400">{s ? format(s.avg) : "—"}</td>
                      <td className="py-0.5 pl-2 text-right tabular-nums text-slate-400">{s ? format(s.max) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}
