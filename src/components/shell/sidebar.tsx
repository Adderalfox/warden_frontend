"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { fmtInt } from "@/lib/format";
import { publicBackendUrl } from "@/lib/backend-url";
import { useAuth } from "./auth-context";
import { IconAlert, IconBook, IconChart, IconCube, IconGrid, IconLogout, IconSliders, IconUser, Logo } from "./icons";
import { useWorkspace } from "./workspace-context";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function Item({
  href, label, icon: I, active, badge, tone = "neutral", onClick,
}: {
  href?: string;
  label: string;
  icon: Icon;
  active?: boolean;
  badge?: number;
  tone?: "neutral" | "bad";
  onClick?: () => void;
}) {
  const cls = clsx(
    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
    active ? "bg-warden-accent/10 text-white" : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
  );
  const inner = (
    <>
      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-warden-accent" />}
      <I className={clsx("h-4 w-4", active ? "text-warden-accent" : "text-slate-500 group-hover:text-slate-300")} />
      <span className="flex-1">{label}</span>
      {!!badge && (
        <span
          className={clsx(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            tone === "bad" ? "bg-warden-danger/15 text-warden-danger" : "bg-warden-accent/15 text-warden-accent"
          )}
        >
          {fmtInt(badge)}
        </span>
      )}
    </>
  );
  return href ? (
    <Link href={href} className={cls} onClick={onClick}>{inner}</Link>
  ) : (
    <button className={cls} onClick={onClick}>{inner}</button>
  );
}

function Section({ children }: { children: string }) {
  return <div className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{children}</div>;
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { overview } = useWorkspace();

  const kpis = overview?.incidents.kpis;
  const openIncidents = kpis ? kpis.active + kpis.awaiting_approval : 0;
  const critical = overview?.cluster.insights?.filter((i) => i.severity === "critical").length ?? 0;
  const is = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const docs = `${publicBackendUrl()}/docs`;

  return (
    <aside className="flex h-full w-60 flex-col rounded-2xl border border-warden-border bg-warden-panel p-3 shadow-card">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2 px-3 pb-3 pt-2">
        <Logo />
        <span className="text-lg font-semibold tracking-tight text-white">warden<span className="text-warden-accent">.ai</span></span>
      </Link>

      <nav className="flex-1 overflow-y-auto">
        <Section>Overview</Section>
        <Item href="/" label="Dashboard" icon={IconGrid} active={is("/")} onClick={onNavigate} />
        <Item href="/incidents" label="Incidents" icon={IconAlert} active={is("/incidents")} badge={openIncidents} onClick={onNavigate} />
        <Section>Analytics</Section>
        <Item href="/metrics" label="Pod Analytics" icon={IconCube} active={is("/metrics")} badge={critical} tone="bad" onClick={onNavigate} />
        <Item href="/performance" label="Performance" icon={IconChart} active={is("/performance")} onClick={onNavigate} />
        <Section>Account</Section>
        <Item href="/profile" label="Profile" icon={IconUser} active={is("/profile")} onClick={onNavigate} />
        <Item href="/settings" label="Settings" icon={IconSliders} active={is("/settings")} onClick={onNavigate} />
        <Item label="Sign out" icon={IconLogout} onClick={() => { onNavigate?.(); logout(); }} />
      </nav>

      <div className="mt-3 rounded-xl border border-warden-border bg-warden-raised p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <IconBook className="h-4 w-4 text-warden-accent" /> Need help?
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Check the API reference, or ask the AI assistant about any chart.</p>
        <a
          href={docs} target="_blank" rel="noreferrer"
          className="mt-2.5 block rounded-lg border border-warden-accent/30 bg-warden-accent/10 py-1.5 text-center text-xs font-medium text-warden-accent hover:bg-warden-accent/20"
        >
          API docs
        </a>
      </div>

      {user && (
        <Link href="/profile" onClick={onNavigate} className="mt-3 flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-warden-accent/15 text-xs font-semibold text-warden-accent">
            {initials(user.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-slate-200">{user.name}</span>
            <span className="block truncate text-[11px] text-slate-500">{user.email}</span>
          </span>
        </Link>
      )}
    </aside>
  );
}
