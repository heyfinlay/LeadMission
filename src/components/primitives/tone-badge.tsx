import { cn } from "@/lib/cn";

type Tone = "default" | "info" | "warn" | "danger" | "success";

const toneClasses: Record<Tone, string> = {
  default: "border-slate-500/40 text-slate-200 bg-slate-600/10",
  info: "border-cyan-500/40 text-cyan-200 bg-cyan-500/10",
  warn: "border-amber-500/40 text-amber-200 bg-amber-500/10",
  danger: "border-red-500/40 text-red-200 bg-red-500/10",
  success: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
};

interface ToneBadgeProps {
  label: string;
  tone?: Tone;
  className?: string;
}

export const ToneBadge = ({ label, tone = "default", className }: ToneBadgeProps) => (
  <span
    className={cn(
      "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide",
      toneClasses[tone],
      className,
    )}
  >
    {label}
  </span>
);
