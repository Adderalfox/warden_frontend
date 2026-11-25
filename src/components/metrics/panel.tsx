import clsx from "clsx";
import type { ReactNode } from "react";

export function Panel({
  title, right, children, className, bodyClassName,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx("rounded border border-warden-border bg-warden-panel", className)}>
      <header className="flex items-center justify-between border-b border-warden-border px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
        {right}
      </header>
      <div className={clsx("p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-[120px] items-center justify-center text-center text-sm text-slate-500">{children}</div>;
}
