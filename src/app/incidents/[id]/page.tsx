"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useIncidentStream } from "@/hooks/use-incident-stream";
import StreamConsole from "@/components/stream-console";
import DiffViewer from "@/components/diff-viewer";
import ApprovalBar from "@/components/approval-bar";
import InsightsList from "@/components/metrics/insights-list";
import type { Insight } from "@/lib/metrics-api";
import { STATUS_COLORS } from "@/lib/api";
import { usePageContext } from "@/components/assistant/assistant-context";

const MIN_W = 200; // just wide enough for the nodes
const MAX_W = 440; // the full-size layout
const COMPACT_BELOW = 330; // under this, labels/arrows/hover box fade out

export default function WarRoomPage({ params }: { params: { id: string } }) {
  const { state, connected } = useIncidentStream(params.id);
  usePageContext({ page: "Incident war room", incident_id: params.id, namespace: state?.namespace, service: state?.service_name });

  const podMetrics = state?.git_context?.pod_metrics as { insights?: Insight[] } | undefined;
  const podInsights = podMetrics?.insights ?? null;

  const [treeW, setTreeW] = useState(MAX_W);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; w: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: treeW };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const next = drag.current.w + (e.clientX - drag.current.x);
    setTreeW(Math.min(MAX_W, Math.max(MIN_W, next)));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className={`flex h-[calc(100vh-3.5rem)] flex-col ${dragging ? "select-none" : ""}`}>
      <header className="flex items-center justify-between border-b border-warden-border bg-warden-panel px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/incidents" className="text-sm text-slate-400 hover:text-white">
            ← Incidents
          </Link>
          <span className="text-sm font-semibold text-white">{params.id}</span>
          {state && (
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium text-black ${STATUS_COLORS[state.status] ?? "bg-slate-600"
                }`}
            >
              {state.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {state && (
            <Link
              href={`/metrics?namespace=${encodeURIComponent(state.namespace ?? "default")}&service=${encodeURIComponent(state.service_name)}`}
              className="text-sm text-slate-400 hover:text-warden-accent"
            >
              Pod analytics →
            </Link>
          )}
          <span className={`text-xs ${connected ? "text-warden-accent" : "text-slate-500"}`}>
            {connected ? "● live" : "○ connecting…"}
          </span>
        </div>
      </header>

      <div
        className="grid flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: `${treeW}px 1fr 300px`,
          // animate the click-to-expand, but track the mouse 1:1 while dragging
          transition: dragging ? "none" : "grid-template-columns 250ms ease",
        }}
      >
        {/* Thought Tree column + drag handle on its right edge */}
        <div className="relative min-w-0 border-r border-warden-border">
          <section className="flex h-full flex-col overflow-y-auto overflow-x-hidden p-4">
            <h2 className="mb-3 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Thought Tree
            </h2>
            <StreamConsole
              logs={state?.agent_logs ?? []}
              compact={treeW < COMPACT_BELOW}
              onNodeClick={() => setTreeW(MAX_W)}
            />
          </section>
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`absolute -right-1 top-0 z-30 h-full w-2 cursor-col-resize touch-none transition-colors ${dragging ? "bg-warden-accent/60" : "hover:bg-warden-accent/40"
              }`}
          />
        </div>

        <section className="min-w-0 overflow-hidden">
          <h2 className="border-b border-warden-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Proposed Patch
          </h2>
          <div className="h-[calc(100%-2.25rem)]">
            <DiffViewer diff={state?.proposed_diff ?? null} />
          </div>
        </section>

        <section className="overflow-y-auto border-l border-warden-border p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Diagnostics
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-500">Service:</span> {state?.service_name}
            </div>
            <div>
              <span className="text-slate-500">Error:</span> {state?.error_summary}
            </div>
            <div>
              <span className="text-slate-500">Tests passed:</span>{" "}
              {state?.test_passed ? "yes" : "no"}
            </div>
          </div>
          {podInsights && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold text-slate-500">Pod health at diagnosis</h3>
              <InsightsList insights={podInsights} compact limit={6} />
            </div>
          )}
          {state && state.logs_collected.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1 text-xs font-semibold text-slate-500">Collected logs</h3>
              <pre className="max-h-64 overflow-auto rounded bg-warden-bg p-2 text-[11px] text-slate-400">
                {state.logs_collected.slice(0, 20).join("\n")}
              </pre>
            </div>
          )}
        </section>
      </div>

      {state && (
        <ApprovalBar incidentId={params.id} status={state.status} prUrl={state.pr_url} />
      )}
    </div>
  );
}