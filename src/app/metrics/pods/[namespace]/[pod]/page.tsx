"use client";

import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import InsightsList from "@/components/metrics/insights-list";
import { EmptyState, Panel } from "@/components/metrics/panel";
import StatusPill from "@/components/metrics/status-pill";
import TimeSeriesChart, { colorFor, type RefLine } from "@/components/metrics/time-series-chart";
import Toolbar from "@/components/metrics/toolbar";
import { usePolling } from "@/hooks/use-polling";
import {
  fmtAge, fmtAgo, fmtBytes, fmtCpu, fmtDateTime, fmtInt, fmtPct, fmtRate, pctColor,
} from "@/lib/format";
import { getPodDetail, getPodEvents, getPodLogs, type PodSnapshot } from "@/lib/metrics-api";
import { hasAnyData } from "@/lib/refs";

const SYNC = "pod";

function Meter({ value, request, limit, fmt }: { value: number | null; request: number | null; limit: number | null; fmt: (v: number) => string }) {
  const pct = value != null && limit ? (100 * value) / limit : null;
  return (
    <div className="min-w-[150px]">
      <div className="text-xs tabular-nums text-slate-200">
        {value != null ? fmt(value) : "—"}
        {pct != null && <span className="ml-1 text-slate-500">({pct.toFixed(0)}% of limit)</span>}
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded bg-warden-bg">
        {pct != null && <div className={clsx("h-full", pctColor(pct))} style={{ width: `${Math.min(100, pct)}%` }} />}
      </div>
      <div className="mt-0.5 text-[10px] text-slate-600">
        req {request != null ? fmt(request) : "—"} · lim {limit != null ? fmt(limit) : "none"}
      </div>
    </div>
  );
}

function LogsPanel({ namespace, pod, containers }: { namespace: string; pod: string; containers: string[] }) {
  const [container, setContainer] = useState(containers[0] ?? "");
  const [lines, setLines] = useState(200);
  const [previous, setPrevious] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setText(await getPodLogs(namespace, pod, { container: container || undefined, lines, previous }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [namespace, pod, container, lines, previous]);

  useEffect(() => { load(); }, [load]);

  const sel = "rounded border border-warden-border bg-warden-bg px-2 py-0.5 text-xs text-slate-200";
  return (
    <Panel
      title="Logs"
      right={
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <select className={sel} value={container} onChange={(e) => setContainer(e.target.value)}>
            {containers.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className={sel} value={lines} onChange={(e) => setLines(Number(e.target.value))}>
            {[100, 200, 500, 1000].map((n) => <option key={n} value={n}>{n} lines</option>)}
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={previous} onChange={(e) => setPrevious(e.target.checked)} /> previous
          </label>
          <button onClick={load} className="rounded border border-warden-border px-2 py-0.5 text-slate-300 hover:text-white">
            {loading ? "…" : "Reload"}
          </button>
        </div>
      }
    >
      {error ? (
        <div className="text-sm text-warden-danger">{error}</div>
      ) : (
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded bg-warden-bg p-2 text-[11px] leading-relaxed text-slate-400">
          {text === null ? "Loading…" : text || "(no log output)"}
        </pre>
      )}
    </Panel>
  );
}

export default function PodDetailPage({ params }: { params: { namespace: string; pod: string } }) {
  const namespace = decodeURIComponent(params.namespace);
  const podName = decodeURIComponent(params.pod);
  const [range, setRange] = useState("1h");
  const [refreshMs, setRefreshMs] = useState(10000);

  const detail = usePolling((s) => getPodDetail(namespace, podName, range, s), `${namespace}/${podName}/${range}`, refreshMs);
  const events = usePolling((s) => getPodEvents(namespace, podName, s), `events:${namespace}/${podName}`, 15000);

  const d = detail.data;
  const pod: PodSnapshot | undefined = d?.pod;
  const series = d?.series;
  const cseries = d?.container_series;
  const containerNames = useMemo(() => pod?.containers.map((c) => c.name) ?? [], [pod]);
  const cColors = useMemo(() => colorFor(containerNames), [containerNames]);
  const podColors = useMemo(() => colorFor([podName]), [podName]);

  const memPct = useMemo(() => {
    const lim = pod?.mem_lim_b;
    const vals = series?.metrics.mem_b?.[podName];
    return lim && vals ? { [podName]: vals.map((v) => (v == null ? null : (100 * v) / lim)) } : {};
  }, [pod, series, podName]);

  const refs = (req: number | null | undefined, lim: number | null | undefined, fmt: (v: number) => string): RefLine[] => [
    ...(req ? [{ y: req, kind: "request" as const, label: `request ${fmt(req)}` }] : []),
    ...(lim ? [{ y: lim, kind: "limit" as const, label: `limit ${fmt(lim)}` }] : []),
  ];

  const nameOfC = (n: string) => n;

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/metrics?namespace=${encodeURIComponent(namespace)}${pod ? `&service=${encodeURIComponent(pod.service)}` : ""}`}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Pod Analytics
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="break-all text-xl font-semibold text-white">{podName}</h1>
            {pod && <StatusPill pod={pod} />}
          </div>
          {pod && (
            <p className="mt-1 text-sm text-slate-500">
              {namespace} · service <span className="text-slate-300">{pod.service}</span> · node{" "}
              <span className="text-slate-300">{pod.node_name ?? "—"}</span> · IP {pod.pod_ip ?? "—"} · age {fmtAge(pod.created_at)} ·{" "}
              {fmtInt(pod.restart_count)} restarts
              {pod.last_termination_reason && <> (last: {pod.last_termination_reason} {fmtAgo(pod.last_termination_at)})</>}
            </p>
          )}
        </div>
        <Toolbar range={range} onRange={setRange} refreshMs={refreshMs} onRefreshMs={setRefreshMs}
          onReload={detail.reload} loading={detail.loading} updatedAt={detail.updatedAt} />
      </div>

      {d?.source.synthetic && (
        <div className="mt-4 rounded border border-warden-warn/50 bg-warden-warn/10 px-4 py-2 text-sm text-warden-warn">
          <strong>DEMO DATA</strong> — synthetic pod and metrics.
        </div>
      )}
      {detail.error && (
        <div className="mt-4 rounded border border-warden-danger/50 bg-warden-danger/10 px-4 py-3 text-sm text-warden-danger">{detail.error}</div>
      )}
      {d?.source.warning && (
        <div className="mt-4 rounded border border-warden-warn/40 bg-warden-warn/10 px-4 py-2 text-sm text-warden-warn">{d.source.warning}</div>
      )}
      {!d && !detail.error && <div className="mt-10 text-center text-sm text-slate-500">Loading…</div>}

      {d && pod && series && cseries && (
        <>
          <Panel title={`Health (${d.insights.length})`} className="mt-6">
            <InsightsList insights={d.insights} />
          </Panel>

          <Panel title="Containers" className="mt-4" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-warden-border text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    {["Container", "State", "Ready", "Restarts", "CPU", "Memory", "Last termination"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-warden-border">
                  {pod.containers.map((c) => (
                    <tr key={c.name}>
                      <td className="px-3 py-2 font-medium text-slate-100">{c.name}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={clsx(c.state === "running" ? "text-warden-accent" : "text-warden-danger")}>{c.state}</span>
                        {c.reason && <div className="text-slate-500">{c.reason}</div>}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{c.ready ? "yes" : "no"}</td>
                      <td className="px-3 py-2 tabular-nums text-slate-300">{c.restart_count}</td>
                      <td className="px-3 py-2"><Meter value={c.cpu_m} request={c.cpu_req_m} limit={c.cpu_lim_m} fmt={fmtCpu} /></td>
                      <td className="px-3 py-2"><Meter value={c.mem_b} request={c.mem_req_b} limit={c.mem_lim_b} fmt={(v) => fmtBytes(v, 0)} /></td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {c.last_termination_reason ? (
                          <>
                            {c.last_termination_reason}
                            {c.last_termination_exit_code != null && ` (exit ${c.last_termination_exit_code})`}
                            <div className="text-slate-600">{fmtAgo(c.last_termination_at)}</div>
                          </>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TimeSeriesChart title="CPU by container" timestamps={cseries.timestamps} series={cseries.metrics.cpu_m ?? {}}
              format={fmtCpu} colors={cColors} nameOf={nameOfC} stackable defaultStacked syncId={SYNC}
              refs={refs(pod.cpu_req_m, pod.cpu_lim_m, fmtCpu)} />
            <TimeSeriesChart title="Memory by container" timestamps={cseries.timestamps} series={cseries.metrics.mem_b ?? {}}
              format={(v) => fmtBytes(v)} colors={cColors} nameOf={nameOfC} stackable defaultStacked syncId={SYNC}
              refs={refs(pod.mem_req_b, pod.mem_lim_b, (v) => fmtBytes(v, 0))} />
            <TimeSeriesChart title="Memory utilisation (% of pod limit)" timestamps={series.timestamps} series={memPct}
              format={(v) => fmtPct(v)} colors={podColors} nameOf={() => "pod"} maxY={110} syncId={SYNC}
              refs={[{ y: 90, kind: "threshold", label: "90%" }]} emptyMessage="This pod has no complete memory limit." />
            <TimeSeriesChart title="Container restarts (counter)" timestamps={series.timestamps} series={series.metrics.restarts ?? {}}
              format={(v) => fmtInt(v)} colors={podColors} nameOf={() => "restarts"} syncId={SYNC}
              emptyMessage="No restart history yet." />
            {hasAnyData(series.metrics.cpu_throttle_pct) && (
              <TimeSeriesChart title="CPU throttling (%)" timestamps={series.timestamps} series={series.metrics.cpu_throttle_pct ?? {}}
                format={(v) => fmtPct(v)} colors={podColors} nameOf={() => "throttled"} maxY={100} syncId={SYNC} />
            )}
            {hasAnyData(series.metrics.net_rx_bps) && (
              <TimeSeriesChart title="Network receive" timestamps={series.timestamps} series={series.metrics.net_rx_bps ?? {}}
                format={fmtRate} colors={podColors} nameOf={() => "rx"} syncId={SYNC} />
            )}
            {hasAnyData(series.metrics.net_tx_bps) && (
              <TimeSeriesChart title="Network transmit" timestamps={series.timestamps} series={series.metrics.net_tx_bps ?? {}}
                format={fmtRate} colors={podColors} nameOf={() => "tx"} syncId={SYNC} />
            )}
          </div>

          <Panel title="Events" className="mt-4" bodyClassName="p-0">
            {events.error ? (
              <div className="px-3 py-4 text-sm text-warden-danger">{events.error}</div>
            ) : !events.data ? (
              <div className="px-3 py-4 text-sm text-slate-500">Loading…</div>
            ) : events.data.events.length === 0 ? (
              <EmptyState>No recent events.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-warden-border text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      {["Last seen", "Type", "Reason", "Message", "Count"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warden-border">
                    {events.data.events.map((e, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap px-3 py-1.5 text-xs text-slate-400" title={fmtDateTime(e.last_seen * 1000)}>{fmtAgo(e.last_seen)}</td>
                        <td className={clsx("px-3 py-1.5 text-xs", e.type === "Warning" ? "text-warden-warn" : "text-slate-400")}>{e.type}</td>
                        <td className="px-3 py-1.5 text-xs font-medium text-slate-200">{e.reason}</td>
                        <td className="px-3 py-1.5 text-xs text-slate-400">{e.message}</td>
                        <td className="px-3 py-1.5 text-right text-xs tabular-nums text-slate-500">{e.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <div className="mt-4">
            <LogsPanel namespace={namespace} pod={podName} containers={containerNames} />
          </div>
        </>
      )}
    </main>
  );
}
