"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fmtAge, fmtBytes, fmtCpu, pctColor } from "@/lib/format";
import type { PodSnapshot } from "@/lib/metrics-api";
import StatusPill, { podStatus } from "./status-pill";

type SortKey = "name" | "status" | "restarts" | "cpu" | "mem" | "age";

function Usage({ value, limit, text }: { value: number | null; limit: number | null; text: string }) {
  const pct = value != null && limit ? (100 * value) / limit : null;
  return (
    <div className="min-w-[110px]">
      <div className="flex justify-between gap-2 text-xs tabular-nums">
        <span className="text-slate-200">{text}</span>
        <span className="text-slate-500">{pct != null ? `${pct.toFixed(0)}%` : limit ? "" : "no limit"}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded bg-warden-bg">
        {pct != null && <div className={clsx("h-full", pctColor(pct))} style={{ width: `${Math.min(100, pct)}%` }} />}
      </div>
    </div>
  );
}

export default function PodTable({ pods, namespace }: { pods: PodSnapshot[]; namespace: string }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "status", dir: 1 });

  const sorted = useMemo(() => {
    const val = (p: PodSnapshot): number | string => {
      switch (sort.key) {
        case "name": return p.name;
        case "status": return { bad: 0, warn: 1, ok: 2 }[podStatus(p).tone] * 1e6 - p.restart_count;
        case "restarts": return p.restart_count;
        case "cpu": return p.cpu_lim_m && p.cpu_m != null ? p.cpu_m / p.cpu_lim_m : p.cpu_m ?? -1;
        case "mem": return p.mem_lim_b && p.mem_b != null ? p.mem_b / p.mem_lim_b : p.mem_b ?? -1;
        case "age": return p.created_at ?? 0;
      }
    };
    return [...pods].sort((a, b) => {
      const x = val(a), y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [pods, sort]);

  const Th = ({ k, children, right }: { k?: SortKey; children: React.ReactNode; right?: boolean }) => (
    <th
      onClick={k ? () => setSort((s) => ({ key: k, dir: s.key === k ? (s.dir === 1 ? -1 : 1) : 1 })) : undefined}
      className={clsx(
        "whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500",
        right ? "text-right" : "text-left", k && "cursor-pointer select-none hover:text-slate-300"
      )}
    >
      {children}
      {k && sort.key === k && <span className="ml-1">{sort.dir === 1 ? "▲" : "▼"}</span>}
    </th>
  );

  if (pods.length === 0) {
    return <div className="px-3 py-8 text-center text-sm text-slate-500">No pods found for this selection.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-warden-border">
          <tr>
            <Th k="name">Pod</Th>
            <Th k="status">Status</Th>
            <Th>Ready</Th>
            <Th k="restarts" right>Restarts</Th>
            <Th k="cpu">CPU</Th>
            <Th k="mem">Memory</Th>
            <Th>Node</Th>
            <Th k="age" right>Age</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-warden-border">
          {sorted.map((p) => {
            const tone = podStatus(p).tone;
            return (
              <tr key={p.name} className={clsx("hover:bg-warden-bg/60", tone === "bad" && "bg-warden-danger/5")}>
                <td className="px-3 py-2">
                  <Link
                    href={`/metrics/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(p.name)}`}
                    className="font-medium text-slate-100 hover:text-warden-accent"
                  >
                    {p.name}
                  </Link>
                  <div className="text-[11px] text-slate-500">{p.service}</div>
                </td>
                <td className="px-3 py-2"><StatusPill pod={p} /></td>
                <td className="px-3 py-2 tabular-nums text-slate-300">{p.ready_containers}</td>
                <td className={clsx("px-3 py-2 text-right tabular-nums", p.restart_count > 0 ? "text-warden-warn" : "text-slate-400")}>
                  {p.restart_count}
                  {p.last_termination_reason && p.restart_count > 0 && (
                    <div className="text-[10px] text-slate-500">{p.last_termination_reason}</div>
                  )}
                </td>
                <td className="px-3 py-2"><Usage value={p.cpu_m} limit={p.cpu_lim_m} text={fmtCpu(p.cpu_m)} /></td>
                <td className="px-3 py-2"><Usage value={p.mem_b} limit={p.mem_lim_b} text={fmtBytes(p.mem_b)} /></td>
                <td className="px-3 py-2 text-xs text-slate-400">{p.node_name ?? "—"}</td>
                <td className="px-3 py-2 text-right text-xs tabular-nums text-slate-400">{fmtAge(p.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
