"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAssistant } from "@/components/assistant/assistant-context";
import { usePolling } from "@/hooks/use-polling";
import { getNamespaces } from "@/lib/metrics-api";
import { useAuth } from "./auth-context";
import { IconBell, IconLogout, IconMenu, IconSliders, IconSparkle, IconUser } from "./icons";
import { initials } from "./sidebar";
import { useWorkspace } from "./workspace-context";

const TITLES: [string, string][] = [
  ["/incidents", "Incidents"], ["/metrics", "Pod Analytics"], ["/performance", "Performance"],
  ["/profile", "Profile"], ["/settings", "Settings"], ["/", "Dashboard"],
];

function titleFor(path: string): string {
  return TITLES.find(([p]) => (p === "/" ? path === "/" : path === p || path.startsWith(`${p}/`)))?.[1] ?? "Dashboard";
}

function useOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onOutside(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onOutside]);
  return ref;
}

function Menu({ button, children, align = "right" }: { button: (toggle: () => void, open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside<HTMLDivElement>(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      {button(() => setOpen((o) => !o), open)}
      {open && (
        <div className={clsx("absolute top-full z-50 mt-2 w-80 rounded-xl border border-warden-border bg-warden-panel p-2 shadow-card", align === "right" ? "right-0" : "left-0")}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

const iconBtn = "relative flex h-9 w-9 items-center justify-center rounded-lg border border-warden-border text-slate-400 hover:border-warden-accent/40 hover:text-white";

export default function Topbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { namespace, setNamespace, overview } = useWorkspace();
  const { open, setOpen } = useAssistant();
  const nsList = usePolling((s) => getNamespaces(s), "namespaces:topbar", 60000);

  const namespaces = Array.from(new Set([...(nsList.data?.namespaces ?? []), ...(namespace ? [namespace] : [])]));
  const insights = overview?.cluster.insights ?? [];
  const alerts = insights.filter((i) => i.severity !== "info");
  const crit = insights.filter((i) => i.severity === "critical").length;
  const synthetic = overview?.cluster.synthetic;
  const title = titleFor(pathname);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 px-5">
      <button onClick={onMenu} className={clsx(iconBtn, "lg:hidden")} aria-label="Open menu"><IconMenu /></button>
      <div className="min-w-0 flex-1 text-sm">
        <span className="text-slate-500">Pages</span> <span className="text-slate-600">/</span>{" "}
        <span className="font-medium text-slate-200">{title}</span>
      </div>

      {synthetic && (
        <span className="hidden rounded-full border border-warden-warn/40 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-warden-warn sm:inline" title="Synthetic data (WARDEN_METRICS_SOURCE=demo)">
          DEMO DATA
        </span>
      )}

      <label className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
        Namespace
        <select
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          className="rounded-lg border border-warden-border bg-warden-panel px-2.5 py-1.5 text-sm text-slate-200 focus:border-warden-accent focus:outline-none"
        >
          {namespaces.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </label>

      <Menu
        button={(toggle) => (
          <button onClick={toggle} className={iconBtn} aria-label="Notifications">
            <IconBell />
            {alerts.length > 0 && (
              <span className={clsx("absolute -right-1 -top-1 min-w-[16px] rounded-full px-1 text-center text-[10px] font-bold text-black", crit ? "bg-warden-danger" : "bg-warden-warn")}>
                {alerts.length}
              </span>
            )}
          </button>
        )}
      >
        {(close) => (
          <div>
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Active issues · {namespace}</div>
            {alerts.length === 0 ? (
              <div className="px-2 py-4 text-sm text-slate-500">No active issues.</div>
            ) : (
              <ul className="max-h-80 overflow-y-auto">
                {alerts.slice(0, 8).map((i, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => { close(); router.push(i.pod ? `/metrics/pods/${encodeURIComponent(namespace)}/${encodeURIComponent(i.pod)}` : "/metrics"); }}
                      className="flex w-full gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/[0.04]"
                    >
                      <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", i.severity === "critical" ? "bg-warden-danger" : "bg-warden-warn")} />
                      <span className="text-sm leading-snug text-slate-300">{i.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/metrics" onClick={close} className="mt-1 block rounded-lg px-2 py-2 text-center text-xs font-medium text-warden-accent hover:bg-white/[0.04]">
              Open Pod Analytics
            </Link>
          </div>
        )}
      </Menu>

      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          "flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
          open ? "border-warden-accent bg-warden-accent/15 text-warden-accent" : "border-warden-accent/30 bg-warden-accent/10 text-warden-accent hover:bg-warden-accent/20"
        )}
      >
        <IconSparkle /> <span className="hidden sm:inline">Ask AI</span>
      </button>

      <Menu
        button={(toggle) => (
          <button onClick={toggle} className="flex h-9 w-9 items-center justify-center rounded-full bg-warden-accent/15 text-xs font-semibold text-warden-accent hover:bg-warden-accent/25" aria-label="Account menu">
            {initials(user?.name ?? "?")}
          </button>
        )}
      >
        {(close) => (
          <div className="w-56">
            <div className="border-b border-warden-border px-2 pb-2">
              <div className="truncate text-sm font-medium text-white">{user?.name}</div>
              <div className="truncate text-xs text-slate-500">{user?.email}</div>
            </div>
            {[
              { href: "/profile", label: "Profile", I: IconUser },
              { href: "/settings", label: "Settings", I: IconSliders },
            ].map(({ href, label, I }) => (
              <Link key={href} href={href} onClick={close} className="mt-1 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-white/[0.04]">
                <I className="h-4 w-4 text-slate-500" /> {label}
              </Link>
            ))}
            <button onClick={() => { close(); logout(); }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-white/[0.04]">
              <IconLogout className="h-4 w-4 text-slate-500" /> Sign out
            </button>
          </div>
        )}
      </Menu>
    </header>
  );
}
