"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { LoadingState } from "@/components/primitives/loading-state";
import { Panel } from "@/components/primitives/panel";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { useAppData } from "@/features/app/app-data-context";
import { formatDateTime } from "@/lib/date";

export default function TaskDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const taskId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { ready, tasks, leads, updateTask } = useAppData();

  const task = useMemo(() => tasks.find((item) => item.id === taskId), [tasks, taskId]);
  const relatedLead = useMemo(
    () => (task?.leadId ? leads.find((lead) => lead.id === task.leadId) : undefined),
    [task, leads],
  );

  if (!ready) {
    return <LoadingState />;
  }

  if (!task) {
    return <LoadingState label="Task not found." />;
  }

  const isDone = task.status === "Done";

  return (
    <div className="space-y-4">
      <Panel title="Task Detail" subtitle="Execution-level task context linked to company profile.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Title</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{task.title}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToneBadge label={task.status} tone={isDone ? "success" : "info"} />
              <ToneBadge
                label={task.priority}
                tone={task.priority === "Critical" ? "danger" : task.priority === "High" ? "warn" : "default"}
              />
            </div>
            <p className="text-sm text-slate-300">Due {formatDateTime(task.dueAt)}</p>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Related Company</p>
            {relatedLead ? (
              <>
                <Link href={`/leads/${relatedLead.id}`} className="text-base font-semibold text-cyan-200 hover:text-cyan-100">
                  {relatedLead.companyName}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/leads/${relatedLead.id}`}
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-cyan-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Company (Manage)
                  </Link>
                  <Link
                    href={`/leads/${relatedLead.id}?view=preview`}
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-cyan-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Company Preview
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">No linked company.</p>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Notes / Description">
        {task.description ? (
          <p className="whitespace-pre-wrap text-sm text-slate-200">{task.description}</p>
        ) : (
          <p className="text-sm text-slate-400">No description captured for this task.</p>
        )}
      </Panel>

      <Panel title="Actions">
        <div className="flex flex-wrap items-center gap-2">
          {isDone ? (
            <UnderlitButton
              variant="outline"
              onClick={async () => {
                await updateTask(task.id, { status: "Open" });
              }}
            >
              Reopen Task
            </UnderlitButton>
          ) : (
            <UnderlitButton
              onClick={async () => {
                await updateTask(task.id, { status: "Done" });
              }}
            >
              Mark Complete
            </UnderlitButton>
          )}
        </div>
      </Panel>
    </div>
  );
}
