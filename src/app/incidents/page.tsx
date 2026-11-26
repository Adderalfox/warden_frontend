"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { usePageContext } from "@/components/assistant/assistant-context";
import { Panel } from "@/components/metrics/panel";
import { Notice } from "@/components/ui/notice";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePolling } from "@/hooks/use-polling";
import { listIncidentRows } from "@/lib/analytics-api";
import { fmtAgo, fmtDuration } from "@/lib/format";

const FILTERS: { key: string; label: string; match: (s: string) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "open", label: "In progress", match: (s) => !["COMPLETED", "FAILED", "AWAITING_APPROVAL"].includes(s) },
  { key: "approval", label: "Needs approval", match: (s) => s === "AWAITING_APPROVAL" },
  { key: "resolved", label: "Resolved", match: (s) => s === "COMPLETED" },
  { key: "failed", label: "Failed", match: (s) => s === "FAILED" },
];

export default function IncidentsPage() {
  usePageContext({ page: "Incidents" });
  const { data, error } = usePolling((s) => listIncidentRows(s), "incidents", 5000);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)!;
    const needle = q.trim().toLowerCase();
    return (data ?? [])
      .filter((i) => f.match(i.status))
      .filter((i) => !needle || `${i.service_name} ${i.error_summary} ${i.incident_id}`.toLowerCase().includes(needle));
  }, [data, filter, q]);

  const counts = (key: string) => (data ?? []).filter((i) => FILTERS.find((x) => x.key === key)!.match(i.status)).length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 px-5 pb-8 pt-2">
      <div>
        <h1 className="text-xl font-semibold text-white">Incidents</h1>
        <p className="mt-0.5 text-sm text-slate-500">Everything Warden has picked up, newest first. Open one to enter its war room.</p>
      </div>
      {error && <Notice tone="error">Couldn't load incidents: {error}</Notice>}

      <Panel title="All incidents" bodyClassName="p-0"
        right={
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search service, summary, id…"
            className="w-56 rounded-lg border border-warden-border bg-warden-bg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-warden-accent/50 focus:outline-none"
          />
        }>
        <div className="flex flex-wrap gap-2 border-b border-warden-border px-4 py-3">
          {FILTERS.map((f) => (
            <button
              key={f.key} onClick={() => setFilter(f.key)}
              className={clsx("rounded-full border px-3 py-1 text-xs transition-colors", filter === f.key ? "border-warden-accent/50 bg-warden-accent/10 text-warden-accent" : "border-warden-border text-slate-400 hover:text-slate-200")}
            >
              {f.label} <span className="ml-1 tabular-nums text-slate-500">{counts(f.key)}</span>
            </button>
          ))}
        </div>

        {!data ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            {data.length === 0 ? <>No incidents yet. POST an alert to <code className="font-mono text-slate-400">/api/v1/alerts/webhook</code> to trigger one.</> : "No incidents match this filter."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-warden-border text-[11px] uppercase tracking-wider text-slate-500">
                  {["Incident", "Service", "Summary", "Status", "Started", "Duration"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-warden-border">
                {rows.map((i) => {
                  const terminal = i.status === "COMPLETED" || i.status === "FAILED";
                  const last = i.agent_logs.length ? Date.parse(i.agent_logs[i.agent_logs.length - 1].timestamp) / 1000 : null;
                  const end = terminal && last ? last : Date.now() / 1000;
                  return (
                    <tr key={i.incident_id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3"><Link href={`/incidents/${i.incident_id}`} className="font-mono text-xs text-warden-accent hover:underline">{i.incident_id}</Link></td>
                      <td className="px-4 py-3 font-medium text-slate-200">{i.service_name}</td>
                      <td className="max-w-md truncate px-4 py-3 text-slate-400" title={i.error_summary}>{i.error_summary}</td>
                      <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{fmtAgo(i.created_at)}</td>
                      <td className="px-4 py-3 text-xs tabular-nums text-slate-400">{i.created_at ? fmtDuration(Math.max(0, end - i.created_at)) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
