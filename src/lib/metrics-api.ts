export interface ContainerSnapshot {
  name: string;
  ready: boolean;
  restart_count: number;
  state: string;
  reason: string | null;
  message: string | null;
  last_termination_reason: string | null;
  last_termination_exit_code: number | null;
  last_termination_at: number | null;
  cpu_m: number | null;
  mem_b: number | null;
  cpu_req_m: number | null;
  cpu_lim_m: number | null;
  mem_req_b: number | null;
  mem_lim_b: number | null;
}

export interface PodSnapshot {
  namespace: string;
  name: string;
  service: string;
  phase: string;
  ready: boolean;
  ready_containers: string;
  restart_count: number;
  node_name: string | null;
  pod_ip: string | null;
  created_at: number | null;
  reason: string | null;
  message: string | null;
  last_termination_reason: string | null;
  last_termination_at: number | null;
  cpu_m: number | null;
  mem_b: number | null;
  cpu_req_m: number | null;
  cpu_lim_m: number | null;
  mem_req_b: number | null;
  mem_lim_b: number | null;
  containers: ContainerSnapshot[];
}

export interface Insight {
  severity: "critical" | "warning" | "info";
  kind: string;
  title: string;
  detail: string;
  pod: string | null;
}

export type SeriesMetric =
  | "cpu_m" | "mem_b" | "restarts" | "net_rx_bps" | "net_tx_bps" | "cpu_throttle_pct";

export interface Series {
  start: number;
  end: number;
  step: number;
  timestamps: number[]; // epoch seconds
  pods: string[];
  metrics: Partial<Record<SeriesMetric, Record<string, (number | null)[]>>>;
  source: string;
  history_seconds: number;
}

export interface SourceInfo {
  kind: string;
  series_source: string;
  synthetic: boolean;
  warning?: string | null;
  last_error?: string | null;
}

export interface Summary {
  pods_total: number;
  running: number;
  pending: number;
  failed: number;
  not_ready: number;
  restarts_total: number;
  restarts_in_window: number;
  cpu_m_total: number | null;
  mem_b_total: number | null;
  cpu_req_m_total: number | null;
  cpu_lim_m_total: number | null;
  mem_req_b_total: number | null;
  mem_lim_b_total: number | null;
}

export interface Limits {
  cpu_req_m: number | null;
  cpu_lim_m: number | null;
  mem_req_b: number | null;
  mem_lim_b: number | null;
}

export interface Dashboard {
  namespace: string;
  service: string | null;
  range_seconds: number;
  generated_at: number;
  source: SourceInfo;
  summary: Summary;
  pods: PodSnapshot[];
  series: Series | null;
  limits: Record<string, Limits>;
  insights: Insight[];
  history: { available_seconds: number; requested_seconds: number };
}

export interface PodDetail {
  pod: PodSnapshot;
  series: Series;
  container_series: Series;
  insights: Insight[];
  source: SourceInfo;
  range_seconds: number;
  generated_at: number;
}

export interface PodEvent {
  type: string | null;
  reason: string | null;
  message: string | null;
  count: number;
  last_seen: number;
  source: string | null;
}

export interface MetricsStatus {
  source: string;
  synthetic: boolean;
  series_source: string;
  collector_running: boolean;
  scrape_interval_seconds: number;
  retention_minutes: number;
  namespaces_collected: string[];
  last_scrape_at: number | null;
  last_error: string | null;
  prometheus: { configured: boolean; reachable: boolean | null; error: string | null };
  available_ranges: string[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Browser-only module (used from client components): go through the Next.js rewrite.
const BASE = "/api/backend/v1/metrics";

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store", signal });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

const qs = (o: Record<string, string | number | boolean | null | undefined>) =>
  Object.entries(o)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

export const getStatus = (s?: AbortSignal) => get<MetricsStatus>("/status", s);
export const getNamespaces = (s?: AbortSignal) => get<{ namespaces: string[] }>("/namespaces", s);
export const getServices = (namespace: string, s?: AbortSignal) =>
  get<{ services: string[] }>(`/services?${qs({ namespace })}`, s);
export const getDashboard = (namespace: string, service: string | null, range: string, s?: AbortSignal) =>
  get<Dashboard>(`/dashboard?${qs({ namespace, service, range })}`, s);
export const getPodDetail = (namespace: string, pod: string, range: string, s?: AbortSignal) =>
  get<PodDetail>(`/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}?${qs({ range })}`, s);
export const getPodEvents = (namespace: string, pod: string, s?: AbortSignal) =>
  get<{ events: PodEvent[] }>(`/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}/events`, s);

export async function getPodLogs(
  namespace: string, pod: string, opts: { container?: string; lines?: number; previous?: boolean }, signal?: AbortSignal
): Promise<string> {
  const res = await fetch(
    `${BASE}/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(pod)}/logs?${qs({
      container: opts.container, lines: opts.lines ?? 200, previous: opts.previous ?? false,
    })}`,
    { cache: "no-store", signal }
  );
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try { detail = (await res.json()).detail ?? detail; } catch { /* ignore */ }
    throw new ApiError(res.status, String(detail));
  }
  return res.text();
}
