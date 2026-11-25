"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { AgentLogEntry } from "@/lib/api";

// Animation timings (ms) for the node playback.
const STEP_MS = 750; // pause between one node starting and the next
const LINE_MS = 200; // connector grows down to the node

function prettyNode(name: string): string {
  return name.replace(/Node$/, "").replace(/([a-z])([A-Z])/g, "$1 $2") + " Node";
}

type Tone = "ok" | "warn" | "fail";

function toneOf(entry: AgentLogEntry): Tone {
  if (/^(FAILED|NO_PATCH|Patch apply failed|Patch applied but tests failed|Reviewer rejected)/.test(entry.summary)) {
    return "fail";
  }
  if (/failed/i.test(entry.summary)) return "warn";
  return "ok";
}

const TONE_CLASSES: Record<Tone, { node: string; box: string; arrow: string }> = {
  ok: {
    node: "border-warden-accent bg-warden-accent/10 text-warden-accent",
    box: "border-warden-border",
    arrow: "text-warden-accent",
  },
  warn: {
    node: "border-warden-warn bg-warden-warn/10 text-warden-warn",
    box: "border-warden-warn/40",
    arrow: "text-warden-warn",
  },
  fail: {
    node: "border-warden-danger bg-warden-danger/10 text-warden-danger",
    box: "border-warden-danger/50",
    arrow: "text-warden-danger",
  },
};

export default function StreamConsole({
  logs,
  compact = false,
  onNodeClick,
}: {
  logs: AgentLogEntry[];
  compact?: boolean; // true when the column is too narrow for labels/arrows/hover box
  onNodeClick?: () => void; // called when a node is clicked while compact
}) {
  // How many nodes have started playing. Reveals one at a time, even for
  // entries that already exist when the page opens.
  const [shown, setShown] = useState(0);
  const lastRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (shown >= logs.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 0 : STEP_MS);
    return () => clearTimeout(t);
  }, [shown, logs.length]);

  // Follow the newest node as it plays in (only matters if the list overflows).
  useEffect(() => {
    lastRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [shown]);

  if (logs.length === 0) {
    return <div className="text-sm text-slate-500">Waiting for agent activity…</div>;
  }

  return (
    // flex-1 + flex-col: rows share the column height, so the chain fills it.
    <ol className="flex flex-1 flex-col">
      {logs.map((entry, i) => {
        // Not revealed yet: an empty slot keeps the row spacing stable.
        if (i >= shown) {
          return <li key={i} className="min-h-[64px] flex-1" />;
        }

        const tone = TONE_CLASSES[toneOf(entry)];
        const hasNext = i < shown - 1; // next node has started -> draw the connector
        const nodeDelay = i === 0 ? 0 : LINE_MS;
        const time = new Date(entry.timestamp).toLocaleTimeString();

        return (
          <li
            key={i}
            ref={i === shown - 1 ? lastRef : null}
            className="group relative flex min-h-[64px] flex-1 pb-4"
          >
            {/* Node + connector down to the next node */}
            <div className="flex w-[150px] shrink-0 flex-col items-center">
              <div
                className="tt-pop relative z-10"
                style={{ animationDelay: `${nodeDelay}ms` }}
              >
                <div
                  onClick={compact ? onNodeClick : undefined}
                  title={compact ? "Click to expand" : undefined}
                  className={clsx(
                    "flex h-9 w-[150px] items-center justify-center whitespace-nowrap rounded-lg border px-2",
                    "text-[11px] font-medium transition-transform duration-150 ease-out group-hover:scale-105",
                    compact && "cursor-pointer",
                    tone.node
                  )}
                >
                  {prettyNode(entry.node)}
                </div>
              </div>
              {hasNext && <div className="tt-line -mb-4 w-0.5 flex-1 bg-warden-border" />}
            </div>

            {/* Arrow: grows toward the box on hover; fades away when compact */}
            <div
              className={clsx(
                "flex h-9 shrink-0 items-center overflow-hidden transition-all duration-200 ease-out",
                compact
                  ? "w-0 opacity-0"
                  : "w-6 opacity-100 [clip-path:inset(0_100%_0_0)] group-hover:[clip-path:inset(0_0_0_0)]",
                tone.arrow
              )}
            >
              <svg width="24" height="10" viewBox="0 0 24 10" fill="none" className="shrink-0">
                <line x1="0" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="2" />
                <polygon points="16,0 24,5 16,10" fill="currentColor" />
              </svg>
            </div>

            {/* Always-visible label: time + one-line summary. The outer div
                handles the compact fade; the inner one plays the entry fade. */}
            <div
              className={clsx(
                "h-9 min-w-0 flex-1 overflow-hidden pl-1 transition-opacity duration-200",
                compact ? "pointer-events-none opacity-0" : "opacity-100"
              )}
            >
              <div className="tt-fade flex h-full flex-col justify-center">
                <span className="text-[10px] leading-tight text-slate-500">{time}</span>
                <span className="truncate text-xs leading-tight text-slate-400">{entry.summary}</span>
              </div>
            </div>

            {/* Full description box, shown on hover. Absolutely positioned so
                it never changes the row height. Disabled when compact. */}
            <div
              className={clsx(
                "absolute left-[174px] right-0 top-0 z-20",
                compact
                  ? "hidden"
                  : [
                    "pointer-events-none translate-x-[-6px] opacity-0 transition-all duration-200 ease-out",
                    "group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100 group-hover:delay-200",
                  ]
              )}
            >
              <div className={clsx("rounded-md border bg-warden-panel px-3 py-2 shadow-lg", tone.box)}>
                <div className="mb-1 flex items-center gap-2 text-[10px]">
                  <span className="font-semibold text-slate-200">{prettyNode(entry.node)}</span>
                  <span className="text-slate-500">{time}</span>
                </div>
                <p className="max-h-28 overflow-y-auto break-words text-sm text-slate-300">
                  {entry.summary}
                </p>
                {entry.tool_calls.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.tool_calls.map((tc, j) => (
                      <span
                        key={j}
                        className="rounded border border-warden-border bg-warden-bg px-1.5 py-0.5 text-[10px] text-slate-400"
                      >
                        {tc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}