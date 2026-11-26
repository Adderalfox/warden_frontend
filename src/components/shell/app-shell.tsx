"use client";

import clsx from "clsx";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import AssistantPanel from "@/components/assistant/assistant-panel";
import { AssistantProvider, useAssistant } from "@/components/assistant/assistant-context";
import AuthProvider, { useAuth } from "./auth-context";
import { IconSparkle, Logo } from "./icons";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import WorkspaceProvider from "./workspace-context";

function Splash() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-slate-500">
        <Logo className="h-8 w-8 animate-pulse" /> <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const { open, setOpen } = useAssistant();
  useEffect(() => setMenu(false), [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* sidebar: docked on large screens, slide-over on small ones */}
      <div className={clsx("fixed inset-0 z-40 bg-black/60 lg:hidden", menu ? "block" : "hidden")} onClick={() => setMenu(false)} />
      <div
        className={clsx(
          "fixed inset-y-0 left-0 z-50 p-3 transition-transform lg:static lg:z-auto lg:translate-x-0",
          menu ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar onNavigate={() => setMenu(false)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMenu(true)} />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>

      <AssistantPanel />

      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          title="Ask the AI assistant"
          className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-warden-accent/40 bg-warden-panel text-warden-accent shadow-card hover:bg-warden-accent/15"
        >
          <IconSparkle className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function Inner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  if (pathname === "/login") return <>{children}</>;
  if (loading || !user) return <Splash />;
  return (
    <WorkspaceProvider>
      <AssistantProvider>
        <Frame>{children}</Frame>
      </AssistantProvider>
    </WorkspaceProvider>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <Inner>{children}</Inner>
    </AuthProvider>
  );
}
