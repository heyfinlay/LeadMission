import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelProps extends PropsWithChildren, HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}

export const Panel = ({
  title,
  subtitle,
  actions,
  className,
  children,
  ...rest
}: PanelProps) => (
  <section
    className={cn(
      "rounded-xl border border-slate-700/60 bg-[linear-gradient(180deg,rgba(22,29,41,0.82),rgba(13,18,27,0.9))] p-4 shadow-[0_18px_40px_rgba(2,7,12,0.45),inset_0_1px_0_rgba(148,163,184,0.08)]",
      className,
    )}
    {...rest}
  >
    {(title || subtitle || actions) && (
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          {title ? <h2 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h2> : null}
          {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
    )}
    {children}
  </section>
);
