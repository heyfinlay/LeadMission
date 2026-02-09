import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Panel } from "@/components/primitives/panel";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { formatDateTime } from "@/lib/date";
import { listCompanies, listTasks } from "@/lib/companies/queries";
import { createServerAuthClient, requireUser } from "@/lib/supabase/auth";
import { TaskStatusButton } from "@/features/tasks/task-status-button";

const VIEWS = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "all", label: "All Open" },
] as const;

type TaskView = (typeof VIEWS)[number]["id"];

const isOpen = (status: string): boolean => status.toLowerCase() !== "done";

const isOverdue = (dueAt: string | null, now = new Date()): boolean => {
  if (!dueAt) {
    return false;
  }

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  return due.getTime() < now.getTime();
};

const isDueToday = (dueAt: string | null, now = new Date()): boolean => {
  if (!dueAt) {
    return false;
  }

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  return due.toDateString() === now.toDateString();
};

const priorityTone = (priority: string): "default" | "warn" | "danger" => {
  const normalized = priority.toLowerCase();
  if (normalized === "critical") {
    return "danger";
  }

  if (normalized === "high") {
    return "warn";
  }

  return "default";
};

const toTitleCase = (value: string): string => {
  if (!value) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

interface TasksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  await requireUser();
  const params = await searchParams;
  const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
  const view: TaskView = VIEWS.some((item) => item.id === rawView) ? (rawView as TaskView) : "overdue";

  const supabase = await createServerAuthClient();
  const [tasksResult, companiesResult] = await Promise.all([listTasks(supabase, 400), listCompanies(supabase)]);

  if (tasksResult.error || companiesResult.error) {
    return (
      <Panel title="Tasks Command Queue" subtitle="Supabase-backed task execution board">
        <p className="text-sm text-red-300">
          Could not load tasks: {tasksResult.error?.message || companiesResult.error?.message}
        </p>
      </Panel>
    );
  }

  const tasks = (tasksResult.data || []).filter((task) => isOpen(task.status));
  const companyMap = new Map((companiesResult.data || []).map((company) => [company.id, company.business_name]));

  const visible = tasks.filter((task) => {
    if (view === "all") {
      return true;
    }

    if (view === "overdue") {
      return isOverdue(task.due_at);
    }

    if (view === "today") {
      return isDueToday(task.due_at);
    }

    return !isOverdue(task.due_at) && !isDueToday(task.due_at);
  });

  return (
    <Panel title="Tasks Command Queue" subtitle="Overdue and due-today queues stay dominant.">
      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map((item) => (
          <Link key={item.id} href={`/tasks?view=${item.id}`}>
            <UnderlitButton variant={item.id === view ? "default" : "outline"} size="sm">
              {item.label}
            </UnderlitButton>
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {visible.length ? (
          visible.map((task) => {
            const companyName = companyMap.get(task.company_id);
            return (
              <article key={task.id} className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
                <Link
                  href={`/tasks/${task.id}`}
                  className="block rounded-md p-1 transition-colors hover:bg-slate-800/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-100">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-400">Due {formatDateTime(task.due_at || undefined)}</p>
                      <p className="mt-1 text-xs text-slate-300">Company: {companyName || "Unassigned"}</p>
                    </div>
                    <ToneBadge label={toTitleCase(task.priority)} tone={priorityTone(task.priority)} />
                  </div>
                </Link>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {task.company_id ? (
                    <Link
                      href={`/companies/${task.company_id}`}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 px-2 py-1 text-xs text-slate-300 hover:border-cyan-400/60 hover:text-cyan-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Company
                    </Link>
                  ) : null}
                  <TaskStatusButton taskId={task.id} nextStatus="done" label="Complete" />
                </div>
              </article>
            );
          })
        ) : (
          <p className="text-sm text-slate-400">No tasks in this view.</p>
        )}
      </div>
    </Panel>
  );
}
