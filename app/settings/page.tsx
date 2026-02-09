import { Panel } from "@/components/primitives/panel";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { formatDateTime } from "@/lib/date";
import { listCompanies, listTasks } from "@/lib/companies/queries";
import { createServerAuthClient, requireUser } from "@/lib/supabase/auth";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createServerAuthClient();

  const [companiesResult, tasksResult] = await Promise.all([listCompanies(supabase), listTasks(supabase, 500)]);

  if (companiesResult.error || tasksResult.error) {
    return (
      <Panel title="Settings" subtitle="Project and auth configuration">
        <p className="text-sm text-red-300">
          Could not load Supabase stats: {companiesResult.error?.message || tasksResult.error?.message}
        </p>
      </Panel>
    );
  }

  const companies = companiesResult.data || [];
  const tasks = tasksResult.data || [];
  const doneTasks = tasks.filter((task) => task.status.toLowerCase() === "done").length;

  return (
    <div className="space-y-4">
      <Panel title="Account" subtitle="Authenticated Supabase session details">
        <div className="space-y-2 text-sm text-slate-200">
          <p><span className="text-slate-400">User ID:</span> {user.id}</p>
          <p><span className="text-slate-400">Email:</span> {user.email || "-"}</p>
          <p><span className="text-slate-400">Last sign-in:</span> {formatDateTime(user.last_sign_in_at || undefined)}</p>
        </div>
      </Panel>

      <Panel title="Supabase Data" subtitle="Live operational data summary">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Companies</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{companies.length}</p>
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Tasks</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{tasks.length}</p>
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Completed Tasks</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-100">{doneTasks}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Migration Status" subtitle="Legacy local data usage has been retired from active routes">
        <div className="space-y-2 text-sm text-slate-200">
          <p>Primary routes now run on Supabase-backed data and auth.</p>
          <div className="flex flex-wrap items-center gap-2">
            <ToneBadge label="Dashboard: Supabase" tone="success" />
            <ToneBadge label="Tasks: Supabase" tone="success" />
            <ToneBadge label="Leads routes: Redirected" tone="info" />
          </div>
          <p className="text-slate-400">If you want, the next cleanup can remove legacy local modules entirely from the codebase.</p>
        </div>
      </Panel>
    </div>
  );
}
