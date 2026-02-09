import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Panel } from "@/components/primitives/panel";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { formatDateTime } from "@/lib/date";
import { getCompanyById, getTaskById } from "@/lib/companies/queries";
import { createServerAuthClient, requireUser } from "@/lib/supabase/auth";
import { TaskStatusButton } from "@/features/tasks/task-status-button";

const toTitleCase = (value: string): string => {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const resolvedParams = await params;
  const supabase = await createServerAuthClient();

  const taskResult = await getTaskById(supabase, resolvedParams.id);
  if (taskResult.error || !taskResult.data) {
    notFound();
  }

  const task = taskResult.data;
  const companyResult = await getCompanyById(supabase, task.company_id);
  const relatedCompany = companyResult.data || null;

  const isDone = task.status.toLowerCase() === "done";

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
              <ToneBadge label={toTitleCase(task.status)} tone={isDone ? "success" : "info"} />
              <ToneBadge
                label={toTitleCase(task.priority)}
                tone={task.priority.toLowerCase() === "critical" ? "danger" : task.priority.toLowerCase() === "high" ? "warn" : "default"}
              />
            </div>
            <p className="text-sm text-slate-300">Due {formatDateTime(task.due_at || undefined)}</p>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Related Company</p>
            {relatedCompany ? (
              <>
                <Link href={`/companies/${relatedCompany.id}`} className="text-base font-semibold text-cyan-200 hover:text-cyan-100">
                  {relatedCompany.business_name}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/companies/${relatedCompany.id}`}
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-cyan-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Company (Manage)
                  </Link>
                  <Link
                    href={`/portal/${relatedCompany.id}`}
                    className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-cyan-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Client Portal
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
        {task.notes ? (
          <p className="whitespace-pre-wrap text-sm text-slate-200">{task.notes}</p>
        ) : (
          <p className="text-sm text-slate-400">No description captured for this task.</p>
        )}
      </Panel>

      <Panel title="Actions">
        <div className="flex flex-wrap items-center gap-2">
          {isDone ? (
            <TaskStatusButton taskId={task.id} nextStatus="open" label="Reopen Task" variant="outline" size="default" />
          ) : (
            <TaskStatusButton taskId={task.id} nextStatus="done" label="Mark Complete" variant="default" size="default" />
          )}
        </div>
      </Panel>
    </div>
  );
}
