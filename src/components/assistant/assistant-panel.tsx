"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconClose, IconSend, IconSparkle, IconTrash } from "@/components/shell/icons";
import { useWorkspace } from "@/components/shell/workspace-context";
import { getAssistantStatus, sendChat, type ToolUse } from "@/lib/assistant-api";
import { ApiError } from "@/lib/http";
import { useAssistant } from "./assistant-context";
import MarkdownLite from "./markdown-lite";

interface Msg {
  role: "user" | "assistant";
  content: string;
  tools?: ToolUse[];
  error?: boolean;
}

const STORE = "warden:assistant:v1";

const TOOL_LABEL: Record<string, string> = {
  get_pod_analytics: "Pod analytics", get_pod_detail: "Pod detail", get_pod_events: "Pod events", get_pod_logs: "Pod logs",
  get_performance_report: "Performance report", list_incidents: "Incidents", get_incident: "Incident",
  list_namespaces: "Namespaces", list_services: "Services",
};

function suggestionsFor(page?: string, pod?: string): string[] {
  if (pod) return ["Is this pod healthy?", "Why did it restart?", "Is memory growing?"];
  switch (page) {
    case "Pod Analytics": return ["What's wrong in this namespace?", "Which pods are closest to their limits?", "Is any pod leaking memory?"];
    case "Performance": return ["How are we doing on MTTR?", "Which services are overprovisioned?", "Where do incidents fail most?"];
    case "Incidents": return ["Summarize recent incidents", "Which incident needs my attention?"];
    default: return ["Summarize cluster health", "What should I look at first?", "How is incident response performing?"];
  }
}

export default function AssistantPanel() {
  const { open, setOpen, context } = useAssistant();
  const { namespace, prefs } = useWorkspace();
  const pathname = usePathname();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE);
      if (raw) setMessages(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    if (open && !status) getAssistantStatus().then(setStatus).catch(() => setStatus({ configured: false, model: "" }));
  }, [open, status]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    abort.current = new AbortController();
    try {
      const history = next.filter((m) => !m.error).map(({ role, content: c }) => ({ role, content: c }));
      const res = await sendChat(history, { namespace, range: prefs.range, ...context, path: pathname }, abort.current.signal);
      setMessages((m) => [...m, { role: "assistant", content: res.reply, tools: res.tool_calls }]);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof ApiError ? e.message : "Couldn't reach the assistant. Is the backend running?";
      setMessages((m) => [...m, { role: "assistant", content: msg, error: true }]);
    } finally {
      setBusy(false);
    }
  }, [busy, messages, namespace, prefs.range, context, pathname]);

  const clear = () => { abort.current?.abort(); setMessages([]); setBusy(false); };
  const where = [context.page, context.pod ?? context.service, context.namespace ?? namespace].filter(Boolean).join(" · ");

  return (
    <aside
      className={clsx(
        "z-40 flex shrink-0 flex-col border-l border-warden-border bg-warden-panel transition-[width] duration-200",
        "max-lg:fixed max-lg:inset-y-0 max-lg:right-0",
        open ? "w-full sm:w-[400px]" : "w-0 overflow-hidden border-l-0"
      )}
      aria-hidden={!open}
    >
      <div className="flex h-full w-full flex-col sm:w-[400px]">
        <header className="flex items-center gap-2.5 border-b border-warden-border px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-warden-accent/15 text-warden-accent"><IconSparkle /></span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white">Warden Assistant</div>
            <div className="truncate text-[11px] text-slate-500">{where ? `Looking at ${where}` : "Ask about your analytics"}</div>
          </div>
          <button onClick={clear} title="Clear conversation" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"><IconTrash /></button>
          <button onClick={() => setOpen(false)} title="Close" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"><IconClose /></button>
        </header>

        {status && !status.configured && (
          <div className="mx-4 mt-3 rounded-lg border border-warden-warn/30 bg-warden-warn/5 px-3 py-2 text-xs leading-relaxed text-warden-warn">
            The assistant needs a Gemini key. Set <code className="font-mono">WARDEN_GEMINI_API_KEY</code> in <code className="font-mono">backend/.env</code> and restart the backend.
          </div>
        )}

        <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="pt-6 text-center">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-warden-accent/10 text-warden-accent"><IconSparkle className="h-5 w-5" /></div>
              <p className="mt-3 text-sm font-medium text-slate-200">Ask me about what's on screen</p>
              <p className="mx-auto mt-1 max-w-[280px] text-xs leading-relaxed text-slate-500">
                I can read pod metrics, issues, events, logs, incidents and performance KPIs, and explain what they mean.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={clsx(
                  "max-w-[92%] rounded-2xl px-3.5 py-2.5",
                  m.role === "user" ? "rounded-br-md bg-warden-accent/15 text-sm text-slate-100" : "rounded-bl-md border border-warden-border bg-warden-raised",
                  m.error && "border-warden-danger/40 bg-warden-danger/5"
                )}
              >
                {m.role === "user" ? (
                  <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                ) : m.error ? (
                  <div className="text-sm text-warden-danger">{m.content}</div>
                ) : (
                  <MarkdownLite text={m.content} />
                )}
                {m.tools && m.tools.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 border-t border-warden-border pt-2">
                    {m.tools.map((t, n) => (
                      <span
                        key={n}
                        title={JSON.stringify(t.args)}
                        className={clsx("rounded-full border px-2 py-0.5 text-[10px]", t.ok ? "border-warden-border text-slate-500" : "border-warden-danger/40 text-warden-danger")}
                      >
                        {TOOL_LABEL[t.name] ?? t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-warden-border bg-warden-raised px-3.5 py-3">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-warden-accent/70" style={{ animationDelay: `${d * 120}ms` }} />
                ))}
                <span className="ml-1 text-xs text-slate-500">Analysing…</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-warden-border p-3">
          {messages.length === 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {suggestionsFor(context.page, context.pod).map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-warden-border px-2.5 py-1 text-xs text-slate-400 hover:border-warden-accent/40 hover:text-slate-200">
                  {s}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-end gap-2 rounded-xl border border-warden-border bg-warden-bg p-2 focus-within:border-warden-accent/50"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              maxLength={4000}
              placeholder="Ask about pods, incidents, performance…"
              className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent px-1 py-1 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warden-accent text-black disabled:opacity-30"
              aria-label="Send"
            >
              <IconSend className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-1.5 px-1 text-[10px] text-slate-600">Read-only. Answers come from live dashboard data; double-check before acting.</p>
        </div>
      </div>
    </aside>
  );
}
