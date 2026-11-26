"use client";

import { useEffect, useState } from "react";
import { usePageContext } from "@/components/assistant/assistant-context";
import { Panel } from "@/components/metrics/panel";
import { useWorkspace } from "@/components/shell/workspace-context";
import { RANGES, REFRESH_OPTIONS } from "@/components/metrics/toolbar";
import { usePolling } from "@/hooks/use-polling";
import { getAssistantStatus } from "@/lib/assistant-api";
import { fmtAgo } from "@/lib/format";
import { getStatus } from "@/lib/metrics-api";

const sel = "rounded-lg border border-warden-border bg-warden-bg px-3 py-2 text-sm text-slate-200 focus:border-warden-accent/60 focus:outline-none";
const input = "w-full rounded-lg border border-warden-border bg-warden-bg px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:border-warden-accent/60 focus:outline-none";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-warden-border py-3 last:border-0">
      <div>
        <div className="text-sm text-slate-200">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Pill({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  const cls = ok === null ? "bg-white/[0.05] text-slate-400" : ok ? "bg-warden-accent/10 text-warden-accent" : "bg-warden-danger/10 text-warden-danger";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export default function SettingsPage() {
  usePageContext({ page: "Settings" });
  const { prefs, setPrefs } = useWorkspace();
  const metrics = usePolling((s) => getStatus(s), "settings:status", 15000);
  const assistant = usePolling(() => getAssistantStatus(), "settings:assistant", 0);
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try { setKey(localStorage.getItem("warden:approval-key") ?? ""); } catch { /* ignore */ }
  }, []);

  function saveKey(v: string) {
    setKey(v);
    setSaved(false);
    try {
      if (v) localStorage.setItem("warden:approval-key", v);
      else localStorage.removeItem("warden:approval-key");
      setSaved(true);
    } catch { /* private mode */ }
  }

  const m = metrics.data;
  const a = assistant.data;
  return (
    <div className="max-w-3xl space-y-4 px-5 pb-10 pt-2">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="mt-0.5 text-sm text-slate-500">Preferences are stored in this browser. Server behaviour is configured in <code className="font-mono">backend/.env</code>.</p>
      </div>

      <Panel title="Dashboard preferences">
        <Row label="Default time range" hint="Used for charts and the assistant when you haven't picked one.">
          <select className={sel} value={prefs.range} onChange={(e) => setPrefs({ range: e.target.value })}>
            {RANGES.map((r) => <option key={r} value={r}>Last {r}</option>)}
          </select>
        </Row>
        <Row label="Default auto-refresh" hint="How often Pod Analytics reloads on a fresh visit.">
          <select className={sel} value={String(prefs.refreshMs)} onChange={(e) => setPrefs({ refreshMs: Number(e.target.value) })}>
            {REFRESH_OPTIONS.map((o) => <option key={o.ms} value={o.ms}>{o.label}</option>)}
          </select>
        </Row>
      </Panel>

      <Panel title="Approval API key" subtitle="Prefills the approve / reject bar in incident war rooms. Stored only in this browser.">
        <input className={input} type="password" value={key} onChange={(e) => saveKey(e.target.value)} placeholder="Paste your WARDEN_APPROVAL_API_KEY" autoComplete="off" />
        <p className="mt-2 text-xs text-slate-500">{saved ? (key ? "Saved." : "Cleared.") : "Leave empty to type it each time."}</p>
      </Panel>

      <Panel title="System status">
        <Row label="Metrics source" hint={m ? `Series from ${m.series_source}` : undefined}>
          {m ? <Pill ok={null}>{m.source}{m.synthetic ? " (synthetic)" : ""}</Pill> : <Pill ok={null}>…</Pill>}
        </Row>
        <Row label="Metrics collector" hint={m ? `Samples every ${m.scrape_interval_seconds}s, keeps ${m.retention_minutes} min${m.last_scrape_at ? ` · last scrape ${fmtAgo(m.last_scrape_at)}` : ""}` : undefined}>
          {m ? <Pill ok={m.synthetic ? null : m.collector_running && !m.last_error}>{m.synthetic ? "not needed" : m.collector_running ? "running" : "stopped"}</Pill> : null}
        </Row>
        {m?.last_error && <div className="py-2 text-xs text-warden-danger">Last error: {m.last_error}</div>}
        <Row label="Prometheus" hint="Optional: long history, network and CPU-throttling panels.">
          {m ? <Pill ok={m.prometheus.configured ? m.prometheus.reachable : null}>{!m.prometheus.configured ? "not configured" : m.prometheus.reachable ? "connected" : "unreachable"}</Pill> : null}
        </Row>
        <Row label="AI assistant" hint={a?.model ? `Model ${a.model}` : undefined}>
          {a ? <Pill ok={a.configured}>{a.configured ? "ready" : "needs WARDEN_GEMINI_API_KEY"}</Pill> : null}
        </Row>
      </Panel>
    </div>
  );
}
