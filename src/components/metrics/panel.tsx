import clsx from "clsx";
import type { ReactNode } from "react";

export function Panel({
  title, subtitle, right, children, className, bodyClassName,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx("rounded-xl border border-warden-border bg-warden-panel shadow-card", className)}>
      <header className="flex items-start justify-between gap-3 px-4 pb-1 pt-3.5">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </header>
      <div className={clsx("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-[120px] items-center justify-center text-center text-sm text-slate-500">{children}</div>;
}
