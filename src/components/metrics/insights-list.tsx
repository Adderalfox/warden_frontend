import clsx from "clsx";
import Link from "next/link";
import type { Insight } from "@/lib/metrics-api";
import { shortPod } from "@/lib/format";

const SEV: Record<Insight["severity"], { dot: string; text: string; label: string }> = {
  critical: { dot: "bg-warden-danger", text: "text-warden-danger", label: "CRIT" },
  warning: { dot: "bg-warden-warn", text: "text-warden-warn", label: "WARN" },
  info: { dot: "bg-slate-500", text: "text-slate-400", label: "INFO" },
};

export default function InsightsList({
  insights, namespace, compact = false, limit,
}: {
  insights: Insight[];
  namespace?: string;
  compact?: boolean;
  limit?: number;
}) {
  if (insights.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-warden-accent">
        <span className="h-2 w-2 rounded-full bg-warden-accent" /> No issues detected.
      </div>
    );
  }
  const shown = limit ? insights.slice(0, limit) : insights;
  return (
    <ul className="space-y-2">
      {shown.map((i, idx) => (
        <li key={`${i.kind}-${i.pod}-${idx}`} className="flex gap-2">
          <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", SEV[i.severity].dot)} />
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className={clsx("shrink-0 text-[10px] font-bold tracking-wider", SEV[i.severity].text)}>{SEV[i.severity].label}</span>
              {namespace && i.pod ? (
                <Link
                  href={`/metrics/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(i.pod)}`}
                  className="min-w-0 text-sm text-slate-200 hover:text-warden-accent"
                  title={i.pod}
                >
                  {i.title.replace(i.pod, shortPod(i.pod, 34))}
                </Link>
              ) : (
                <span className="min-w-0 text-sm text-slate-200">{i.title}</span>
              )}
            </div>
            {!compact && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{i.detail}</p>}
          </div>
        </li>
      ))}
      {limit && insights.length > limit && (
        <li className="pl-4 text-xs text-slate-500">+ {insights.length - limit} more</li>
      )}
    </ul>
  );
}
