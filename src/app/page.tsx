import Link from "next/link";
import { listIncidents, STATUS_COLORS, type IncidentState } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let incidents: IncidentState[] = [];
  let loadError: string | null = null;
  try {
    incidents = await listIncidents();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load incidents";
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Warden</h1>
          <p className="mt-1 text-sm text-slate-400">Incident Dashboard</p>
        </div>
        <Link
          href="/metrics"
          className="rounded border border-warden-border px-3 py-1.5 text-sm text-slate-300 hover:border-warden-accent hover:text-white"
        >
          Pod Analytics →
        </Link>
      </div>

      {loadError && (
        <div className="mt-6 rounded border border-warden-danger/50 bg-warden-danger/10 px-4 py-3 text-sm text-warden-danger">
          Could not reach the Warden backend: {loadError}
        </div>
      )}

      <div className="mt-8 divide-y divide-warden-border rounded border border-warden-border">
        {incidents.length === 0 && !loadError && (
          <div className="px-4 py-6 text-sm text-slate-500">
            No incidents yet. POST an alert to /api/v1/alerts/webhook to trigger one.
          </div>
        )}
        {incidents.map((inc) => (
          <Link
            key={inc.incident_id}
            href={`/incidents/${inc.incident_id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-warden-panel"
          >
            <div>
              <div className="text-sm font-medium text-white">{inc.service_name}</div>
              <div className="text-xs text-slate-500">{inc.error_summary}</div>
            </div>
            <span
              className={`rounded px-2 py-1 text-xs font-medium text-black ${
                STATUS_COLORS[inc.status] ?? "bg-slate-600"
              }`}
            >
              {inc.status}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
