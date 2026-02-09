import { CheckCircle2, Clock3 } from "lucide-react";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { formatDateTime } from "@/lib/date";
import { isDueToday, isOverdue, timeRemaining } from "@/lib/tasks/urgency";
import type { Task } from "@/types/models";

interface TaskChipProps {
  task: Task;
  onComplete?: (task: Task) => Promise<void>;
  compact?: boolean;
}

const priorityToneMap: Record<Task["priority"], "default" | "warn" | "danger"> = {
  Low: "default",
  Medium: "default",
  High: "warn",
  Critical: "danger",
};

export const TaskChip = ({ task, onComplete, compact = false }: TaskChipProps) => {
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);

  return (
    <article
      className={`rounded-lg border p-3 ${
        overdue
          ? "border-red-500/50 bg-red-500/10"
          : dueToday
            ? "border-cyan-400/50 bg-cyan-500/10"
            : "border-slate-700/60 bg-slate-900/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-100">{task.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {formatDateTime(task.dueAt)}
            </span>
            <span>{timeRemaining(task)}</span>
          </div>
        </div>
        <ToneBadge label={task.priority} tone={priorityToneMap[task.priority]} />
      </div>

      {!compact && onComplete && task.status === "Open" ? (
        <div className="mt-3">
          <UnderlitButton size="sm" variant="outline" onClick={() => void onComplete(task)}>
            <CheckCircle2 className="h-4 w-4" />
            Complete
          </UnderlitButton>
        </div>
      ) : null}
    </article>
  );
};
