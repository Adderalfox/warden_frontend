import { request } from "./http";
import type { Insight } from "./metrics-api";

export interface IncidentKpis {
  total: number;
  active: number;
  awaiting_approval: number;
  completed: number;
  failed: number;
  success_rate: number | null;
  mttr_seconds: number | null;
  mttr_median_seconds: number | null;
  time_to_patch_seconds: number | null;
  approval_wait_seconds: number | null;
  validation_pass_rate: number | null;
  stage_avg_seconds: Record<string, number | null>;
  failures_by_stage: Record<string, number>;
  incidents_by_hour: number[];
}

export interface IncidentRow {
  incident_id: string;
  service_name: string;
  status: string;
  error_summary: string;
  created_at: number | null;
  duration_seconds: number | null;
  failure_reason: string | null;
}

export interface ServiceRow {
  service: string;
  pods: number;
  ready: number;
  availability_pct: number;
  restarts: number;
  cpu_m: number | null;
  cpu_req_m: number | null;
  cpu_lim_m: number | null;
  mem_b: number | null;
  mem_req_b: number | null;
  mem_lim_b: number | null;
  cpu_util_of_request_pct: number | null;
  mem_util_of_request_pct: number | null;
  cpu_pct_of_limit: number | null;
  mem_pct_of_limit: number | null;
  cpu_headroom_m: number | null;
  mem_headroom_b: number | null;
  flags: string[];
}

export interface Health {
  score: number | null;
  grade: "healthy" | "degraded" | "critical" | "unknown";
  penalties: { label: string; points: number }[];
}

export interface ClusterBlock {
  namespace: string;
  error: string | null;
  synthetic?: boolean;
  series_source?: string;
  summary?: {
    pods_total: number; running: number; pending: number; failed: number; not_ready: number;
    restarts_total: number; restarts_in_window: number;
  };
  health?: Health;
  totals?: {
    availability_pct: number | null;
    cpu_util_of_request_pct: number | null;
    mem_util_of_request_pct: number | null;
    cpu_unused_request_m: number;
    mem_unused_request_b: number;
    restarts_total: number;
    overprovisioned_services: string[];
  };
  services?: ServiceRow[];
  insights?: Insight[];
}

export interface Overview {
  generated_at: number;
  namespace: string;
  incidents: { kpis: IncidentKpis; recent: IncidentRow[] };
  cluster: ClusterBlock;
}

const B = "/api/backend/v1";
export const getOverview = (namespace: string, signal?: AbortSignal) =>
  request<Overview>(`${B}/analytics/overview?namespace=${encodeURIComponent(namespace)}`, { signal });
export const getPerformance = (namespace: string, signal?: AbortSignal) =>
  request<Overview>(`${B}/analytics/performance?namespace=${encodeURIComponent(namespace)}`, { signal });

export const listIncidentRows = (signal?: AbortSignal) =>
  request<
    {
      incident_id: string; service_name: string; status: string; error_summary: string;
      created_at: number | null; failure_reason: string | null; namespace?: string;
      agent_logs: { timestamp: string }[];
    }[]
  >(`${B}/incidents`, { signal });
