import clsx from "clsx";
import type { PodSnapshot } from "@/lib/metrics-api";

const BAD = new Set([
  "CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull", "CreateContainerConfigError",
  "CreateContainerError", "InvalidImageName", "RunContainerError", "OOMKilled", "Error",
]);

export function podStatus(p: Pick<PodSnapshot, "phase" | "ready" | "reason">): { label: string; tone: "ok" | "warn" | "bad" } {
  if (p.reason && BAD.has(p.reason)) return { label: p.reason, tone: "bad" };
  if (p.phase === "Failed") return { label: "Failed", tone: "bad" };
  if (p.phase === "Pending") return { label: p.reason || "Pending", tone: "warn" };
  if (p.phase === "Running" && !p.ready) return { label: "NotReady", tone: "warn" };
  if (p.phase === "Running") return { label: "Running", tone: "ok" };
  return { label: p.phase, tone: "warn" };
}

export default function StatusPill({ pod }: { pod: Pick<PodSnapshot, "phase" | "ready" | "reason"> }) {
  const s = podStatus(pod);
  return (
    <span
      className={clsx(
        "inline-block rounded px-1.5 py-0.5 text-[11px] font-medium",
        s.tone === "ok" && "bg-warden-accent/15 text-warden-accent",
        s.tone === "warn" && "bg-warden-warn/15 text-warden-warn",
        s.tone === "bad" && "bg-warden-danger/15 text-warden-danger"
      )}
    >
      {s.label}
    </span>
  );
}
