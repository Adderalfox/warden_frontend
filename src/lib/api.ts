import { request } from "./http";
import { publicBackendUrl } from "./backend-url";

export interface AgentLogEntry {
  node: string;
  timestamp: string;
  summary: string;
  tool_calls: string[];
}

export interface IncidentState {
  incident_id: string;
  service_name: string;
  status: string;
  error_summary: string;
  raw_stack_trace: string;
  logs_collected: string[];
  git_context: Record<string, unknown>;
  proposed_diff: string | null;
  test_passed: boolean;
  pr_url: string | null;
  agent_logs: AgentLogEntry[];
  failure_reason: string | null;
  namespace?: string;
  created_at?: number | null;
}

// Server Components run fetch() outside a browser, so a relative URL can't
// be resolved -- go straight to the backend there. In the browser, use the
// relative path so it goes through the Next.js rewrite in next.config.js.
const BASE = typeof window === "undefined"
  ? `${process.env.WARDEN_API_URL || "http://localhost:8000"}/api/v1`
  : "/api/backend/v1";

export async function listIncidents(): Promise<IncidentState[]> {
  return request<IncidentState[]>(`${BASE}/incidents`);
}

export async function getIncident(id: string): Promise<IncidentState> {
  return request<IncidentState>(`${BASE}/incidents/${id}`);
}

export function incidentStreamUrl(id: string): string {
  // SSE must bypass the Next.js rewrite proxy, which buffers streams.
  const direct = publicBackendUrl();
  return `${direct}/api/v1/incidents/${id}/stream`;
}

export async function submitApproval(
  id: string,
  decision: "APPROVE" | "REJECT",
  apiKey: string
): Promise<void> {
  await request<unknown>(`${BASE}/approval/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ decision }),
  });
}

export const STATUS_COLORS: Record<string, string> = {
  INGESTED: "bg-slate-600",
  DIAGNOSING: "bg-warden-warn",
  PATCH_GENERATED: "bg-blue-500",
  AWAITING_APPROVAL: "bg-warden-warn",
  COMPLETED: "bg-warden-accent",
  FAILED: "bg-warden-danger",
};