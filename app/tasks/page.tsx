"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { LoadingState } from "@/components/primitives/loading-state";
import { Panel } from "@/components/primitives/panel";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { useAppData } from "@/features/app/app-data-context";
import { attachBusinessContext, filterTasksByView, type TaskView } from "@/features/tasks/task-query";
import { formatDateTime } from "@/lib/date";
import type { Priority } from "@/types/models";

const VIEWS: { id: TaskView; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All Open" },
];

const priorityTone = (priority: Priority): "default" | "warn" | "danger" => {
  if (priority === "Critical") {
    return "danger";
  }

  if (priority === "High") {
    return "warn";
  }

  return "default";
};

export default function TasksPage() {
  const { ready, tasks, leads, updateTask } = useAppData();
  const [view, setView] = useState<TaskView>("overdue");

  const visible = useMemo(() => filterTasksByView(tasks, view), [tasks, view]);
  const rows = useMemo(() => attachBusinessContext(visible, leads), [visible, leads]);

  if (!ready) {
    return <LoadingState />;
  }

  return (
    <Panel title="Tasks Command Queue" subtitle="Overdue and due-today queues stay dominant.">
      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((item) => (
          <UnderlitButton
            key={item.id}
            variant={item.id === view ? "default" : "outline"}
            size="sm"
            onClick={() => setView(item.id)}
          >
            {item.label}
          </UnderlitButton>
        ))}
      </div>

      <div className="space-y-2">
        {rows.length ? (
          rows.map(({ task, businessId, businessName }) => (
            <article key={task.id} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
              <Link
                href={`/tasks/${task.id}`}
                className="block rounded-md p-1 transition-colors hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{task.title}</p>
                    <p className="mt-1 text-xs text-slate-400">Due {formatDateTime(task.dueAt)}</p>
                    <p className="mt-1 text-xs text-slate-300">Company: {businessName || "Unassigned"}</p>
                  </div>
                  <ToneBadge label={task.priority} tone={priorityTone(task.priority)} />
                </div>
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {businessId ? (
                  <Link
                    href={`/leads/${businessId}`}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 px-2 py-1 text-xs text-slate-300 hover:border-cyan-400/60 hover:text-cyan-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Company
                  </Link>
                ) : null}
                <UnderlitButton
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await updateTask(task.id, { status: "Done" });
                  }}
                >
                  Complete
                </UnderlitButton>
              </div>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-400">No tasks in this view.</p>
        )}
      </div>
    </Panel>
  );
}
