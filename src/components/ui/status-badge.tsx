import clsx from "clsx";

const LABEL: Record<string, string> = {
  INGESTED: "Ingested", DIAGNOSING: "Diagnosing", PATCH_GENERATED: "Patch ready",
  AWAITING_APPROVAL: "Needs approval", COMPLETED: "Resolved", FAILED: "Failed",
};

export function incidentTone(status: string): "ok" | "bad" | "warn" | "progress" {
  if (status === "COMPLETED") return "ok";
  if (status === "FAILED") return "bad";
  if (status === "AWAITING_APPROVAL") return "warn";
  return "progress";
}

export function StatusBadge({ status }: { status: string }) {
  const tone = incidentTone(status);
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        tone === "ok" && "bg-warden-accent/10 text-warden-accent",
        tone === "bad" && "bg-warden-danger/10 text-warden-danger",
        tone === "warn" && "bg-warden-warn/10 text-warden-warn",
        tone === "progress" && "bg-sky-400/10 text-sky-300"
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", tone === "ok" && "bg-warden-accent", tone === "bad" && "bg-warden-danger", tone === "warn" && "bg-warden-warn", tone === "progress" && "animate-pulse bg-sky-300")} />
      {LABEL[status] ?? status}
    </span>
  );
}
