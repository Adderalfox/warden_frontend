"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePageContext } from "@/components/assistant/assistant-context";
import { EmptyState, Panel } from "@/components/metrics/panel";
import { StatCard } from "@/components/metrics/stat-card";
import { IconAlert, IconClock, IconCpu, IconServer, IconShield, IconTarget, IconZap } from "@/components/shell/icons";
import { useWorkspace } from "@/components/shell/workspace-context";
import { Gauge, gradeColor } from "@/components/ui/gauge";
import { Notice } from "@/components/ui/notice";
import { UtilBar } from "@/components/ui/util-bar";
import { usePolling } from "@/hooks/use-polling";
import { getPerformance } from "@/lib/analytics-api";
import { fmtBytes, fmtCpu, fmtDuration, fmtInt, fmtPct, fmtSeconds } from "@/lib/format";

const FLAG: Record<string, [string, "warn" | "bad"]> = {
  cpu_overprovisioned: ["CPU over-provisioned", "warn"], memory_overprovisioned: ["Memory over-provisioned", "warn"],
  memory_near_limit: ["Memory near limit", "bad"], cpu_near_limit: ["CPU near limit", "bad"],
};
const STAGE_LABEL = (n: string) => n.replace(/Node$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
const tip = {
  contentStyle: { background: "#070c0e", border: "1px solid #16232a", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "#8aa3a8" }, cursor: { fill: "rgba(255,255,255,0.03)" },
};

function Section({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export default function PerformancePage() {
  const { namespace } = useWorkspace();
  usePageContext({ page: "Performance", namespace });
  const { data, error } = usePolling((s) => getPerformance(namespace, s), `perf:${namespace}`, 30000, !!namespace);

  const k = data?.incidents.kpis;
  const c = data?.cluster;
  const stages = k ? Object.entries(k.stage_avg_seconds).filter(([, v]) => v != null).map(([n, v]) => ({ name: STAGE_LABEL(n), seconds: v as number })) : [];
  const hours = k ? k.incidents_by_hour.map((n, i) => ({ h: i === 23 ? "now" : `-${23 - i}h`, n })) : [];
  const failures = k ? Object.entries(k.failures_by_stage).sort((a, b) => b[1] - a[1]) : [];
  const resolved = k ? k.completed + k.failed : 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-8 px-5 pb-10 pt-2">
      <div>
        <h1 className="text-xl font-semibold text-white">Performance</h1>
        <p className="mt-0.5 text-sm text-slate-500">How well Warden resolves incidents, and how efficiently <span className="text-slate-300">{namespace}</span> uses what it requests.</p>
      </div>
      {error && <Notice tone="error">Couldn't load the performance report: {error}</Notice>}
      {!data && !error && <div className="py-16 text-center text-sm text-slate-500">Loading…</div>}

      {k && (
        <Section title="Incident response" note="Measured from when an alert is received. Incident history lives in memory, so it resets when the backend restarts.">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Mean time to resolve" icon={<IconClock />} value={k.mttr_seconds != null ? fmtDuration(k.mttr_seconds) : "—"} sub={k.mttr_median_seconds != null ? `median ${fmtDuration(k.mttr_median_seconds)}` : "No resolved incidents yet"} />
            <StatCard label="Time to patch" icon={<IconZap />} value={k.time_to_patch_seconds != null ? fmtDuration(k.time_to_patch_seconds) : "—"} sub="alert → candidate fix" />
            <StatCard label="Approval wait" icon={<IconShield />} value={k.approval_wait_seconds != null ? fmtDuration(k.approval_wait_seconds) : "—"} sub="human review time" />
            <StatCard label="Fix success rate" icon={<IconTarget />} value={k.success_rate != null ? fmtPct(k.success_rate * 100) : "—"} tone={k.success_rate == null ? "neutral" : k.success_rate >= 0.8 ? "ok" : k.success_rate >= 0.5 ? "warn" : "bad"} sub={resolved ? `${k.completed} of ${resolved} resolved` : "No resolved incidents yet"} />
            <StatCard label="Tests passing" icon={<IconCpu />} value={k.validation_pass_rate != null ? fmtPct(k.validation_pass_rate * 100) : "—"} sub="patches passing validation" />
            <StatCard label="Incidents" icon={<IconAlert />} value={fmtInt(k.total)} sub={`${k.active} active · ${k.awaiting_approval} awaiting · ${k.failed} failed`} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel title="Incidents, last 24 hours" subtitle="By hour received">
              <div className="h-56">
                {k.total === 0 ? <EmptyState>No incidents recorded yet.</EmptyState> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hours} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke="#13202a" vertical={false} />
                      <XAxis dataKey="h" interval={3} stroke="#2a3a42" tick={{ fontSize: 10, fill: "#64818b" }} />
                      <YAxis allowDecimals={false} stroke="#2a3a42" tick={{ fontSize: 10, fill: "#64818b" }} />
                      <Tooltip {...tip} />
                      <Bar dataKey="n" name="Incidents" fill="#2fbfae" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>

            <Panel title="Time spent per stage" subtitle="Average seconds per agent step">
              <div className="h-56">
                {stages.length === 0 ? <EmptyState>Needs at least one incident with several completed steps.</EmptyState> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stages} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                      <CartesianGrid stroke="#13202a" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v: number) => fmtSeconds(v)} stroke="#2a3a42" tick={{ fontSize: 10, fill: "#64818b" }} />
                      <YAxis type="category" dataKey="name" width={110} stroke="#2a3a42" tick={{ fontSize: 11, fill: "#8aa3a8" }} />
                      <Tooltip {...tip} formatter={(v: number) => [fmtSeconds(v), "avg"]} />
                      <Bar dataKey="seconds" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                        {stages.map((_, i) => <Cell key={i} fill={i % 2 ? "#5aa9e6" : "#2fbfae"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Panel>

            <Panel title="Where fixes fail" subtitle="Failed incidents by stage">
              {failures.length === 0 ? (
                <EmptyState>{k.total ? "No failed incidents." : "No incidents yet."}</EmptyState>
              ) : (
                <ul className="space-y-3">
                  {failures.map(([stage, n]) => (
                    <li key={stage}>
                      <div className="flex justify-between text-sm"><span className="text-slate-300">{STAGE_LABEL(stage)}</span><span className="tabular-nums text-slate-400">{n}</span></div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-warden-bg"><div className="h-full rounded-full bg-warden-danger" style={{ width: `${(100 * n) / k.failed}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </Section>
      )}

      {c && (
        <Section title="Infrastructure efficiency" note={`Namespace ${namespace}. Utilisation is current usage as a share of what pods request, so low numbers mean paid-for capacity sitting idle.`}>
          {c.error ? (
            <Notice tone="error">Cluster data unavailable: {c.error}</Notice>
          ) : (
            <>
              {c.synthetic && <Notice tone="demo">Synthetic pods and metrics. Nothing here comes from a real cluster.</Notice>}
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
                <Panel title="Cluster health score">
                  <Gauge value={c.health?.score ?? null} label={c.health?.grade ?? "—"} color={gradeColor(c.health?.grade)} />
                  <ul className="mt-3 space-y-1.5 text-xs">
                    {c.health?.penalties.length ? c.health.penalties.map((p) => (
                      <li key={p.label} className="flex justify-between text-slate-400"><span>{p.label}</span><span className="tabular-nums text-warden-danger">−{p.points}</span></li>
                    )) : <li className="text-center text-slate-500">No deductions.</li>}
                  </ul>
                </Panel>
                <div className="grid grid-cols-2 content-start gap-4 xl:grid-cols-3">
                  <StatCard label="Availability" icon={<IconServer />} value={c.totals?.availability_pct != null ? fmtPct(c.totals.availability_pct, 1) : "—"} tone={c.totals?.availability_pct == null ? "neutral" : c.totals.availability_pct >= 99.9 ? "ok" : c.totals.availability_pct >= 60 ? "warn" : "bad"} sub={`${c.summary?.running}/${c.summary?.pods_total} pods ready`} />
                  <StatCard label="CPU utilisation" icon={<IconCpu />} value={fmtPct(c.totals?.cpu_util_of_request_pct)} pct={c.totals?.cpu_util_of_request_pct} sub="of requested CPU" />
                  <StatCard label="Memory utilisation" icon={<IconCpu />} value={fmtPct(c.totals?.mem_util_of_request_pct)} pct={c.totals?.mem_util_of_request_pct} sub="of requested memory" />
                  <StatCard label="Idle CPU requested" icon={<IconZap />} value={fmtCpu(c.totals?.cpu_unused_request_m)} sub="requested but unused" />
                  <StatCard label="Idle memory requested" icon={<IconZap />} value={fmtBytes(c.totals?.mem_unused_request_b)} sub="requested but unused" />
                  <StatCard label="Restarts" icon={<IconAlert />} value={fmtInt(c.totals?.restarts_total)} tone={c.totals?.restarts_total ? "warn" : "ok"} sub="since pods were created" />
                </div>
              </div>

              <Panel title="Efficiency by service" bodyClassName="p-0"
                right={<Link href="/metrics" className="text-xs font-medium text-warden-accent hover:underline">Pod analytics →</Link>}>
                {!c.services?.length ? <div className="px-4 py-8 text-center text-sm text-slate-500">No services in this namespace.</div> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-warden-border text-[11px] uppercase tracking-wider text-slate-500">
                          {["Service", "Pods", "Availability", "CPU used / req", "CPU % req", "Mem used / req", "Mem % req", "Restarts", "Findings"].map((h) => <th key={h} className="px-4 py-2.5 text-left font-medium">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-warden-border">
                        {c.services.map((s) => (
                          <tr key={s.service} className="hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5 font-medium text-slate-100">{s.service}</td>
                            <td className="px-4 py-2.5 tabular-nums text-slate-300">{s.ready}/{s.pods}</td>
                            <td className="px-4 py-2.5"><UtilBar pct={s.availability_pct} mode="availability" /></td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-400">{fmtCpu(s.cpu_m)} / {fmtCpu(s.cpu_req_m)}</td>
                            <td className="px-4 py-2.5"><UtilBar pct={s.cpu_util_of_request_pct} empty="no data" /></td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums text-slate-400">{fmtBytes(s.mem_b, 0)} / {fmtBytes(s.mem_req_b, 0)}</td>
                            <td className="px-4 py-2.5"><UtilBar pct={s.mem_util_of_request_pct} empty="no data" /></td>
                            <td className={`px-4 py-2.5 tabular-nums ${s.restarts ? "text-warden-warn" : "text-slate-500"}`}>{s.restarts}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex flex-wrap gap-1">
                                {s.flags.length === 0 ? <span className="text-xs text-slate-600">—</span> : s.flags.map((f) => (
                                  <span key={f} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${FLAG[f]?.[1] === "bad" ? "bg-warden-danger/10 text-warden-danger" : "bg-warden-warn/10 text-warden-warn"}`}>{FLAG[f]?.[0] ?? f}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </>
          )}
        </Section>
      )}
    </div>
  );
}
