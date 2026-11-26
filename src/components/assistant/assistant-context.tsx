"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PageContext } from "@/lib/assistant-api";

interface AssistantCtx {
  open: boolean;
  setOpen: (v: boolean) => void;
  context: PageContext;
  setContext: (c: PageContext) => void;
}

const Ctx = createContext<AssistantCtx | null>(null);

export function AssistantProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<PageContext>({});
  const value = useMemo(() => ({ open, setOpen, context, setContext }), [open, context]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAssistant(): AssistantCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAssistant outside AssistantProvider");
  return v;
}

/** Pages call this to tell the assistant what the user is currently looking at. */
export function usePageContext(ctx: PageContext) {
  const { setContext } = useAssistant();
  const key = JSON.stringify(ctx);
  useEffect(() => {
    setContext(JSON.parse(key));
    return () => setContext({});
  }, [key, setContext]);
}
