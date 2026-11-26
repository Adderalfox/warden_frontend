"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import InsightsList from "@/components/metrics/insights-list";
import { EmptyState, Panel } from "@/components/metrics/panel";
import { StatCard } from "@/components/metrics/stat-card";
import { usePageContext } from "@/components/assistant/assistant-context";
import { IconAlert, IconClock, IconShield, IconTarget } from "@/components/shell/icons";
import { useWorkspace } from "@/components/shell/workspace-context";
import { Gauge, gradeColor } from "@/components/ui/gauge";
import { Notice } from "@/components/ui/notice";
import { StatusBadge } from "@/components/ui/status-badge";
import { UtilBar } from "@/components/ui/util-bar";
import { usePolling } from "@/hooks/use-polling";
import { fmtAgo, fmtClock, fmtDateTime, fmtDuration, fmtInt, fmtPct } from "@/lib/format";
import { getDashboard } from "@/lib/metrics-api";

const FLAG_LABEL: Record<string, string> = {
  cpu_overprovisioned: "CPU over-provisioned", memory_overprovisioned: "Memory over-provisioned",
  memory_near_limit: "Memory near limit", cpu_near_limit: "CPU near limit",
};

export default function DashboardPage() {
  const { namespace, overview, overviewError } = useWorkspace();
  usePageContext({ page: "Dashboard", namespace });

  const series = usePolling((s) => getDashboard(namespace, null, "1h", s), `home-series:${namespace}`, 30000, !!namespace);

  // Cluster-wide utilisation over time: usage as % of the summed limits (falls back to requests).
  const rows = useMemo(() => {
    const d = series.data;
    if (!d?.series) return [];
    const pct = (metric: "cpu_m" | "mem_b", limKey: "cpu_lim_m" | "mem_lim_b", reqKey: "cpu_req_m" | "mem_req_b") => {
      const per = d.series!.metrics[metric] ?? {};
      const withLim = Object.keys(per).filter((p) => d.limits[p]?.[limKey]);
      const names = withLim.length ? withLim : Object.keys(per).filter((p) => d.limits[p]?.[reqKey]);
      const key = withLim.length ? limKey : reqKey;
      const cap = names.reduce((a, p) => a + (d.limits[p][key] ?? 0), 0);
      return d.series!.timestamps.map((_, i) => {
        if (!cap) return null;
        const vals = names.map((p) => per[p]?.[i]);
        if (vals.every((v) => v == null)) return null;
        return (100 * vals.reduce((a: number, v) => a + (v ?? 0), 0)) / cap;
      });
    };
    const cpu = pct("cpu_m", "cpu_lim_m", "cpu_req_m");
    const mem = pct("mem_b", "mem_lim_b", "mem_req_b");
    return d.series.timestamps.map((t, i) => ({ t: t * 1000, cpu: cpu[i], mem: mem[i] }));
  }, [series.data]);

  const k = overview?.incidents.kpis;
  const c = overview?.cluster;
  const health = c?.health;
  const loading = !overview && !overviewError;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 px-5 pb-8 pt-2">
      {overviewError && <Notice tone="error">Couldn't load analytics: {overviewError}</Notice>}
      {c?.error && (
        <Notice tone="error">
          <div>Cluster data unavailable: {c.error}</div>
          <div className="mt-1 text-xs text-slate-500">
            Point the backend at a cluster (<code className="font-mono">WARDEN_KUBECONFIG_PATH</code>), or set <code className="font-mono">WARDEN_METRICS_SOURCE=demo</code> to preview with synthetic data.
            Incident analytics below still work.
          </div>
        </Notice>
      )}
      {c?.synthetic && (
        <Notice tone="demo">Synthetic pods and metrics (<code className="font-mono">WARDEN_METRICS_SOURCE=demo</code>). Nothing here comes from a real cluster.</Notice>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cluster health" icon={<IconShield />}
          value={health?.score != null ? `${health.score}/100` : "—"}
          tone={health?.grade === "healthy" ? "ok" : health?.grade === "degraded" ? "warn" : health?.grade === "critical" ? "bad" : "neutral"}
          sub={health?.score != null ? `${health.grade} · ${c?.summary?.running}/${c?.summary?.pods_total} pods running` : loading ? "Loading…" : "No pod data"}
        />
        <StatCard
          label="Open incidents" icon={<IconAlert />} value={k ? fmtInt(k.active + k.awaiting_approval) : "—"}
          tone={k && k.awaiting_approval ? "warn" : "neutral"}
          sub={k ? `${k.awaiting_approval} awaiting your approval · ${k.total} total` : "Loading…"}
        />
        <StatCard
          label="Auto-fix success" icon={<IconTarget />} value={k?.success_rate != null ? fmtPct(k.success_rate * 100) : "—"}
          tone={k?.success_rate == null ? "neutral" : k.success_rate >= 0.8 ? "ok" : k.success_rate >= 0.5 ? "warn" : "bad"}
          sub={k ? (k.completed + k.failed ? `${k.completed} resolved · ${k.failed} failed` : "No resolved incidents yet") : "Loading…"}
        />
        <StatCard
          label="Mean time to resolve" icon={<IconClock />} value={k?.mttr_seconds != null ? fmtDuration(k.mttr_seconds) : "—"}
          sub={k?.mttr_median_seconds != null ? `median ${fmtDuration(k.mttr_median_seconds)}` : "Needs a resolved incident"}
        />
      </div>

      {!c?.error && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
          <Panel
            title="Resource utilisation" subtitle={`${namespace} · last hour · usage as % of pod limits`}
            right={
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warden-accent" />CPU</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-400" />Memory</span>
              </div>
            }
          >
            <div className="h-64">
              {rows.length === 0 || rows.every((r) => r.cpu == null && r.mem == null) ? (
                <EmptyState>{series.error ?? "No utilisation data yet. History fills in as the collector samples."}</EmptyState>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gcpu" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2fbfae" stopOpacity={0.35} /><stop offset="100%" stopColor="#2fbfae" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gmem" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.22} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#13202a" vertical={false} />
                    <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(v: number) => fmtClock(v)} stroke="#2a3a42" tick={{ fontSize: 11, fill: "#64818b" }} minTickGap={48} />
                    <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} stroke="#2a3a42" tick={{ fontSize: 11, fill: "#64818b" }} width={48} />
                    <Tooltip
                      isAnimationActive={false} cursor={{ stroke: "#2a3a42" }}
                      content={({ active, payload, label }) =>
                        active && payload?.length ? (
                          <div className="rounded-lg border border-warden-border bg-warden-bg/95 px-3 py-2 text-xs shadow-lg">
                            <div className="mb-1 text-slate-400">{fmtDateTime(Number(label))}</div>
                            {payload.map((p) => (
                              <div key={String(p.dataKey)} className="flex justify-between gap-6">
                                <span className="text-slate-300">{p.dataKey === "cpu" ? "CPU" : "Memory"}</span>
                                <span className="tabular-nums text-white">{p.value != null ? `${Number(p.value).toFixed(1)}%` : "—"}</span>
                              </div>
                            ))}
                          </div>
                        ) : null
                      }
                    />
                    <Area dataKey="mem" stroke="#38bdf8" strokeWidth={1.8} fill="url(#gmem)" dot={false} isAnimationActive={false} connectNulls={false} />
                    <Area dataKey="cpu" stroke="#2fbfae" strokeWidth={2} fill="url(#gcpu)" dot={false} isAnimationActive={false} connectNulls={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>

          <Panel title="Health score" subtitle="How the score is calculated">
            <Gauge value={health?.score ?? null} label={health?.grade ?? "—"} color={gradeColor(health?.grade)} />
            <ul className="mt-3 space-y-1.5 text-xs">
              {health?.penalties.length ? (
                health.penalties.map((p) => (
                  <li key={p.label} className="flex justify-between text-slate-400">
                    <span>{p.label}</span><span className="tabular-nums text-warden-danger">−{p.points}</span>
                  </li>
                ))
              ) : (
                <li className="text-center text-slate-500">{health?.score != null ? "No deductions. Everything looks healthy." : "—"}</li>
              )}
            </ul>
            {c?.summary && (
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-warden-border pt-3 text-center">
                {[["Running", `${c.summary.running}/${c.summary.pods_total}`], ["Not ready", fmtInt(c.summary.not_ready)], ["Restarts", fmtInt(c.summary.restarts_total)]].map(([l, v]) => (
                  <div key={l}><div className="text-base font-semibold tabular-nums text-white">{v}</div><div className="text-[10px] uppercase tracking-wider text-slate-500">{l}</div></div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {!c?.error && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
          <Panel title="Services" subtitle="Availability and resource use by service" bodyClassName="p-0"
            right={<Link href="/performance" className="text-xs font-medium text-warden-accent hover:underline">Efficiency report →</Link>}>
            {!c?.services?.length ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">{loading ? "Loading…" : "No services found in this namespace."}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-warden-border text-[11px] uppercase tracking-wider text-slate-500">
                      {["Service", "Pods", "Availability", "CPU / request", "Memory / request", "Restarts"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warden-border">
                    {c.services.map((s) => (
                      <tr key={s.service} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5">
                          <Link href={`/metrics?service=${encodeURIComponent(s.service)}`} className="font-medium text-slate-100 hover:text-warden-accent">{s.service}</Link>
                          {s.flags.length > 0 && <div className="mt-0.5 text-[10px] text-warden-warn">{FLAG_LABEL[s.flags[0]] ?? s.flags[0]}</div>}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-slate-300">{s.ready}/{s.pods}</td>
                        <td className="px-4 py-2.5"><UtilBar pct={s.availability_pct} mode="availability" /></td>
                        <td className="px-4 py-2.5"><UtilBar pct={s.cpu_util_of_request_pct} empty="no data" /></td>
                        <td className="px-4 py-2.5"><UtilBar pct={s.mem_util_of_request_pct} empty="no data" /></td>
                        <td className={`px-4 py-2.5 tabular-nums ${s.restarts ? "text-warden-warn" : "text-slate-500"}`}>{s.restarts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Needs attention" subtitle={`${c?.insights?.filter((i) => i.severity !== "info").length ?? 0} active issues`}
            right={<Link href="/metrics" className="text-xs font-medium text-warden-accent hover:underline">All issues →</Link>}>
            {c?.insights ? <InsightsList insights={c.insights} namespace={namespace} compact limit={6} /> : <div className="text-sm text-slate-500">Loading…</div>}
          </Panel>
        </div>
      )}

      <Panel title="Recent incidents" bodyClassName="p-0" right={<Link href="/incidents" className="text-xs font-medium text-warden-accent hover:underline">View all →</Link>}>
        {!overview ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">Loading…</div>
        ) : overview.incidents.recent.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No incidents yet. POST an alert to <code className="font-mono text-slate-400">/api/v1/alerts/webhook</code> to trigger one.
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
                {overview.incidents.recent.map((i) => (
                  <tr key={i.incident_id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5"><Link href={`/incidents/${i.incident_id}`} className="font-mono text-xs text-warden-accent hover:underline">{i.incident_id}</Link></td>
                    <td className="px-4 py-2.5 text-slate-200">{i.service_name}</td>
                    <td className="max-w-xs truncate px-4 py-2.5 text-slate-400" title={i.error_summary}>{i.error_summary}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={i.status} /></td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{fmtAgo(i.created_at)}</td>
                    <td className="px-4 py-2.5 text-xs tabular-nums text-slate-400">{i.duration_seconds != null ? fmtDuration(i.duration_seconds) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
