import { cn } from "@/lib/cn";

interface MeterProps {
  label?: string;
  value: number;
  max?: number;
  className?: string;
}

export const Meter = ({ label, value, max = 100, className }: MeterProps) => {
  const safeValue = Math.min(max, Math.max(0, value));
  const width = `${(safeValue / max) * 100}%`;

  return (
    <div className={cn("space-y-1", className)}>
      {label ? <div className="text-xs text-slate-300">{label}</div> : null}
      <div className="h-2 overflow-hidden rounded bg-slate-800/80">
        <div
          className="h-full rounded bg-[linear-gradient(90deg,#22d3ee,#fb7185)] transition-all duration-150"
          style={{ width }}
        />
      </div>
      <div className="text-xs font-semibold text-cyan-100">{safeValue}/100</div>
    </div>
  );
};
