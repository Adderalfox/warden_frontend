import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "info" | "warn" | "error" | "demo";

const STYLE: Record<Tone, string> = {
  info: "border-warden-border bg-warden-panel text-slate-400",
  warn: "border-warden-warn/30 bg-warden-warn/5 text-warden-warn",
  error: "border-warden-danger/30 bg-warden-danger/5 text-warden-danger",
  demo: "border-warden-border bg-warden-panel text-slate-400",
};

export function Notice({ tone = "info", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <div className={clsx("flex items-start gap-3 rounded-xl border px-4 py-2.5 text-sm", STYLE[tone], className)}>
      {tone === "demo" && (
        <span className="mt-0.5 shrink-0 rounded-full border border-warden-warn/40 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-warden-warn">DEMO</span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
