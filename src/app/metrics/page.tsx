"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo } from "react";
import { usePageContext } from "@/components/assistant/assistant-context";
import { useWorkspace } from "@/components/shell/workspace-context";
import { Notice } from "@/components/ui/notice";
import InsightsList from "@/components/metrics/insights-list";
import { Panel } from "@/components/metrics/panel";
import PodTable from "@/components/metrics/pod-table";
import { StatCard } from "@/components/metrics/stat-card";
import TimeSeriesChart, { colorFor } from "@/components/metrics/time-series-chart";
import Toolbar from "@/components/metrics/toolbar";
import { fmtBytes, fmtCpu, fmtDuration, fmtInt, fmtPct, fmtRate } from "@/lib/format";
import { usePolling } from "@/hooks/use-polling";
import { getDashboard, getServices } from "@/lib/metrics-api";
import { buildRefs, hasAnyData } from "@/lib/refs";

const SYNC = "pods";

function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const ws = useWorkspace();
  const namespace = ws.namespace;
  const service = params.get("service") ?? "";
  const range = params.get("range") ?? ws.prefs.range;
  const refreshMs = Number(params.get("refresh") ?? ws.prefs.refreshMs);

  const setParam = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router]
  );

  // A deep link such as /metrics?namespace=prod&service=api switches the shared namespace once.
  const linkedNs = params.get("namespace");
  const { setNamespace } = ws;
  useEffect(() => {
    if (linkedNs) {
      setNamespace(linkedNs);
      const next = new URLSearchParams(window.location.search);
      next.delete("namespace");
      router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedNs]);

  usePageContext({ page: "Pod Analytics", namespace, service: service || undefined, range });

  const svcList = usePolling((s) => getServices(namespace, s), `services:${namespace}`, 60000, !!namespace);
  const dash = usePolling(
    (s) => getDashboard(namespace, service || null, range, s),
    `${namespace}|${service}|${range}`,
    refreshMs,
    !!namespace
  );

  const d = dash.data;
  const series = d?.series ?? null;
  const podNames = useMemo(() => (d ? d.pods.map((p) => p.name) : []), [d]);
  const colors = useMemo(() => colorFor(podNames), [podNames]);

  const memPct = useMemo(() => {
    if (!series || !d) return {};
    const out: Record<string, (number | null)[]> = {};
    for (const [pod, vals] of Object.entries(series.metrics.mem_b ?? {})) {
      const lim = d.limits[pod]?.mem_lim_b;
      if (lim) out[pod] = vals.map((v) => (v == null ? null : (100 * v) / lim));
    }
    return out;
  }, [series, d]);

  const cpuPct = useMemo(() => {
    if (!series || !d) return {};
    const out: Record<string, (number | null)[]> = {};
    for (const [pod, vals] of Object.entries(series.metrics.cpu_m ?? {})) {
      const req = d.limits[pod]?.cpu_req_m;
      if (req) out[pod] = vals.map((v) => (v == null ? null : (100 * v) / req));
    }
    return out;
  }, [series, d]);

  const openPod = (pod: string) => router.push(`/metrics/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}`);
  const s = d?.summary;
  const crit = d?.insights.filter((i) => i.severity === "critical").length ?? 0;
  const warn = d?.insights.filter((i) => i.severity === "warning").length ?? 0;
  const cpuPctTotal = s?.cpu_m_total != null && s.cpu_lim_m_total ? (100 * s.cpu_m_total) / s.cpu_lim_m_total : null;
  const memPctTotal = s?.mem_b_total != null && s.mem_lim_b_total ? (100 * s.mem_b_total) / s.mem_lim_b_total : null;
  const collecting =
    d && d.source.series_source === "collector" && d.history.available_seconds < d.history.requested_seconds * 0.9;
  const refsFor = (key: "cpu_req_m" | "cpu_lim_m" | "mem_req_b" | "mem_lim_b", kind: "limit" | "request", fmt: (v: number) => string) =>
    d ? buildRefs(d.limits, podNames, key, kind, fmt) : [];

  return (
    <div className="mx-auto max-w-[1600px] px-5 pb-10 pt-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Pod Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            CPU, memory, restarts and health for pods{service ? ` of ${service}` : ""} in <span className="text-slate-300">{namespace || "…"}</span>
            {d && <> · series from <span className="text-slate-300">{d.source.series_source}</span></>}
          </p>
        </div>
        <Toolbar
          service={service} services={svcList.data?.services} onService={(v) => setParam({ service: v || null })}
          range={range} onRange={(v) => setParam({ range: v })}
          refreshMs={refreshMs} onRefreshMs={(v) => setParam({ refresh: String(v) })}
          onReload={dash.reload} loading={dash.loading} updatedAt={dash.updatedAt}
        />
      </div>

      {d?.source.synthetic && (
        <Notice tone="demo" className="mt-4">Synthetic pods and metrics (<code className="font-mono">WARDEN_METRICS_SOURCE=demo</code>). Nothing here comes from a real cluster.</Notice>
      )}
      {dash.error && (
        <Notice tone="error" className="mt-4">
          <div>{d ? "Refresh failed (showing last data): " : "Could not load pod metrics: "}{dash.error}</div>
          {!d && (
            <div className="mt-1 text-xs text-slate-500">
              Point the backend at a cluster (WARDEN_KUBECONFIG_PATH or ~/.kube/config), or set
              WARDEN_METRICS_SOURCE=demo in backend/.env and restart it to explore the dashboard with synthetic data.
            </div>
          )}
        </Notice>
      )}
      {d?.source.warning && <Notice tone="warn" className="mt-4">{d.source.warning}</Notice>}
      {collecting && (
        <Notice className="mt-4">
          Collecting history: {fmtDuration(d!.history.available_seconds)} of the requested {fmtDuration(d!.history.requested_seconds)} is available.
          The collector samples every few seconds; set WARDEN_PROMETHEUS_URL to read longer history from Prometheus.
        </Notice>
      )}

      {!d && !dash.error && <div className="mt-10 text-center text-sm text-slate-500">Loading pod metrics…</div>}

      {d && s && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Pods running" value={`${s.running}/${s.pods_total}`} tone={s.failed ? "bad" : s.pending ? "warn" : "ok"}
              sub={`${s.pending} pending · ${s.failed} failed`} />
            <StatCard label="Not ready" value={fmtInt(s.not_ready)} tone={s.not_ready ? "warn" : "ok"} sub="running but failing readiness" />
            <StatCard label="Restarts (window)" value={fmtInt(s.restarts_in_window)} tone={s.restarts_in_window ? "warn" : "ok"}
              sub={`${fmtInt(s.restarts_total)} lifetime`} />
            <StatCard label="CPU" value={fmtCpu(s.cpu_m_total)} pct={cpuPctTotal}
              sub={s.cpu_lim_m_total ? `${fmtPct(cpuPctTotal)} of ${fmtCpu(s.cpu_lim_m_total)} limit` : "no CPU limits set"} />
            <StatCard label="Memory" value={fmtBytes(s.mem_b_total)} pct={memPctTotal}
              sub={s.mem_lim_b_total ? `${fmtPct(memPctTotal)} of ${fmtBytes(s.mem_lim_b_total)} limit` : "no memory limits set"} />
            <StatCard label="Issues" value={String(crit + warn)} tone={crit ? "bad" : warn ? "warn" : "ok"} sub={`${crit} critical · ${warn} warnings`} />
          </div>

          <Panel title={`Detected issues (${d.insights.length})`} className="mt-4">
            <InsightsList insights={d.insights} namespace={namespace} limit={8} />
          </Panel>

          {series && (
            <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <TimeSeriesChart title="CPU usage by pod" timestamps={series.timestamps} series={series.metrics.cpu_m ?? {}}
                format={fmtCpu} colors={colors} refs={[...refsFor("cpu_req_m", "request", fmtCpu), ...refsFor("cpu_lim_m", "limit", fmtCpu)]}
                stackable syncId={SYNC} onSeriesClick={openPod} />
              <TimeSeriesChart title="Memory (working set) by pod" timestamps={series.timestamps} series={series.metrics.mem_b ?? {}}
                format={(v) => fmtBytes(v)} colors={colors}
                refs={[...refsFor("mem_req_b", "request", (v) => fmtBytes(v, 0)), ...refsFor("mem_lim_b", "limit", (v) => fmtBytes(v, 0))]}
                stackable syncId={SYNC} onSeriesClick={openPod} />
              <TimeSeriesChart title="Memory utilisation (% of limit)" timestamps={series.timestamps} series={memPct}
                format={(v) => fmtPct(v)} colors={colors} refs={[{ y: 90, kind: "threshold", label: "90%" }]} maxY={110}
                syncId={SYNC} onSeriesClick={openPod} emptyMessage="No pods with a memory limit — set resources.limits.memory to see utilisation." />
              <TimeSeriesChart title="CPU utilisation (% of request)" timestamps={series.timestamps} series={cpuPct}
                format={(v) => fmtPct(v)} colors={colors} refs={[{ y: 100, kind: "threshold", label: "100% of request" }]}
                syncId={SYNC} onSeriesClick={openPod} emptyMessage="No pods with a CPU request set." />
              <TimeSeriesChart title="Container restarts (counter)" timestamps={series.timestamps} series={series.metrics.restarts ?? {}}
                format={(v) => fmtInt(v)} colors={colors} syncId={SYNC} onSeriesClick={openPod}
                emptyMessage="No restart data (needs kube-state-metrics via Prometheus, or collector history)." />
              {hasAnyData(series.metrics.cpu_throttle_pct) ? (
                <TimeSeriesChart title="CPU throttling (% of periods throttled)" timestamps={series.timestamps}
                  series={series.metrics.cpu_throttle_pct ?? {}} format={(v) => fmtPct(v)} colors={colors} syncId={SYNC}
                  onSeriesClick={openPod} maxY={100} />
              ) : null}
              {hasAnyData(series.metrics.net_rx_bps) ? (
                <TimeSeriesChart title="Network receive" timestamps={series.timestamps} series={series.metrics.net_rx_bps ?? {}}
                  format={fmtRate} colors={colors} syncId={SYNC} onSeriesClick={openPod} />
              ) : null}
              {hasAnyData(series.metrics.net_tx_bps) ? (
                <TimeSeriesChart title="Network transmit" timestamps={series.timestamps} series={series.metrics.net_tx_bps ?? {}}
                  format={fmtRate} colors={colors} syncId={SYNC} onSeriesClick={openPod} />
              ) : null}
            </div>
          )}
          {series && !hasAnyData(series.metrics.net_rx_bps) && (
            <p className="mt-3 text-xs text-slate-600">
              Network and CPU-throttling panels appear when the backend has WARDEN_PROMETHEUS_URL configured (cAdvisor metrics).
            </p>
          )}

          <Panel title={`Pods (${d.pods.length})`} className="mt-4" bodyClassName="p-0">
            <PodTable pods={d.pods} namespace={namespace} />
          </Panel>
        </>
      )}
    </div>
  );
}

export default function MetricsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">Loading…</div>}>
      <Dashboard />
    </Suspense>
  );
}
