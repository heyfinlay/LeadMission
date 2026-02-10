import Link from "next/link";
import { AlertTriangle, CalendarCheck2, Flame, LineChart, Radar } from "lucide-react";
import { Panel } from "@/components/primitives/panel";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { formatDateTime } from "@/lib/date";
import { listCompanies, listTasks } from "@/lib/companies/queries";
import { createServerAuthClient, requireUser } from "@/lib/supabase/auth";
import { TaskStatusButton } from "@/features/tasks/task-status-button";

const isTaskOpen = (status: string): boolean => status.toLowerCase() !== "done";

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

const scoreCompanyUrgency = (company: { score: number; priority: string }): number => {
  const priorityWeight =
    company.priority === "Critical" ? 60 : company.priority === "High" ? 28 : company.priority === "Medium" ? 12 : 0;

  return company.score + priorityWeight;
};

export default async function DashboardPage() {
  await requireUser();
  const supabase = await createServerAuthClient();

  const [companiesResult, tasksResult] = await Promise.all([listCompanies(supabase), listTasks(supabase, 400)]);

  if (companiesResult.error || tasksResult.error) {
    return (
      <Panel title="Dashboard" subtitle="Mission board overview">
        <p className="text-sm text-red-300">
          Could not load dashboard data: {companiesResult.error?.message || tasksResult.error?.message}
        </p>
      </Panel>
    );
  }

  const companies = companiesResult.data || [];
  const tasks = tasksResult.data || [];
  const companyMap = new Map(companies.map((company) => [company.id, company.business_name]));

  const openTasks = tasks.filter((task) => isTaskOpen(task.status));
  const overdueTasks = openTasks.filter((task) => isOverdue(task.due_at)).slice(0, 5);
  const dueTodayTasks = openTasks.filter((task) => isDueToday(task.due_at)).slice(0, 5);
  const criticalQueue = openTasks.filter((task) => task.priority.toLowerCase() === "critical").slice(0, 6);

  const topCompanies = [...companies]
    .sort((a, b) => scoreCompanyUrgency(b) - scoreCompanyUrgency(a))
    .slice(0, 6);

  const staleThresholdMs = 14 * 86_400_000;
  const staleCompanies = companies
    .filter((company) => {
      const updatedAt = new Date(company.updated_at).getTime();
      return !Number.isNaN(updatedAt) && Date.now() - updatedAt > staleThresholdMs;
    })
    .slice(0, 6);

  return (
    <div className="space-y-4">
      <Panel title="Pipeline Totals" subtitle="Active company count + execution load" actions={<LineChart className="h-4 w-4 text-cyan-300" />}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Companies</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{companies.length}</p>
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Open Tasks</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-100">{openTasks.length}</p>
          </div>
          <Link href="/tasks" className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 hover:border-cyan-400/60">
            <p className="text-xs uppercase tracking-wide text-slate-400">Task Board</p>
            <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-slate-100">
              <CalendarCheck2 className="h-5 w-5 text-cyan-300" />
              Open
            </p>
          </Link>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Overdue Tasks"
          subtitle="Immediate action queue"
          className="border-red-500/30 bg-[linear-gradient(180deg,rgba(62,16,16,0.32),rgba(13,18,27,0.9))]"
          actions={<ToneBadge label={`${overdueTasks.length}`} tone="danger" />}
        >
          <div className="space-y-2">
            {overdueTasks.length ? (
              overdueTasks.map((task) => (
                <article key={task.id} className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
                  <p className="text-sm font-semibold text-slate-100">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{companyMap.get(task.company_id) || "Unknown company"}</p>
                  <p className="mt-1 text-xs text-slate-400">Due {formatDateTime(task.due_at || undefined)}</p>
                  <div className="mt-2">
                    <TaskStatusButton taskId={task.id} nextStatus="done" label="Complete" />
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-400">No overdue tasks.</p>
            )}
          </div>
        </Panel>

        <Panel
          title="Due Today"
          subtitle="Today’s execution block"
          className="border-cyan-500/30 bg-[linear-gradient(180deg,rgba(11,58,70,0.3),rgba(13,18,27,0.9))]"
          actions={<ToneBadge label={`${dueTodayTasks.length}`} tone="info" />}
        >
          <div className="space-y-2">
            {dueTodayTasks.length ? (
              dueTodayTasks.map((task) => (
                <article key={task.id} className="rounded-lg border border-cyan-400/50 bg-cyan-500/10 p-3">
                  <p className="text-sm font-semibold text-slate-100">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{companyMap.get(task.company_id) || "Unknown company"}</p>
                  <p className="mt-1 text-xs text-slate-400">Due {formatDateTime(task.due_at || undefined)}</p>
                  <div className="mt-2">
                    <TaskStatusButton taskId={task.id} nextStatus="done" label="Complete" />
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-400">No tasks due today.</p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Critical Queue" subtitle="High-risk open tasks" actions={<Flame className="h-4 w-4 text-red-300" />}>
          <div className="space-y-2">
            {criticalQueue.length ? (
              criticalQueue.map((task) => (
                <article key={task.id} className="rounded border border-slate-700/70 p-2">
                  <p className="text-sm text-slate-100">{task.title}</p>
                  <p className="text-xs text-slate-400">Due {formatDateTime(task.due_at || undefined)}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-slate-400">No critical tasks right now.</p>
            )}
          </div>
        </Panel>

        <Panel title="Top Priority Companies" subtitle="Score + priority blended" actions={<Radar className="h-4 w-4 text-cyan-300" />}>
          <div className="space-y-2">
            {topCompanies.map((company) => (
              <Link key={company.id} href={`/companies/${company.id}`} className="block rounded border border-slate-700/70 p-2 hover:border-cyan-400/60">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{company.business_name}</p>
                  <ToneBadge
                    label={company.priority}
                    tone={company.priority === "Critical" ? "danger" : company.priority === "High" ? "warn" : "default"}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">Score {company.score} • Updated {formatDateTime(company.updated_at)}</p>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Stale Companies" subtitle="No updates for 14+ days" actions={<AlertTriangle className="h-4 w-4 text-amber-300" />}>
          <div className="space-y-2">
            {staleCompanies.length ? (
              staleCompanies.map((company) => (
                <Link key={company.id} href={`/companies/${company.id}`} className="block rounded border border-slate-700/70 p-2 hover:border-amber-400/60">
                  <p className="text-sm font-semibold text-slate-100">{company.business_name}</p>
                  <p className="mt-1 text-xs text-slate-400">Last update {formatDateTime(company.updated_at)}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-400">No stale companies.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
