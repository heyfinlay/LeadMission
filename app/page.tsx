"use client";

import Link from "next/link";
import { AlertTriangle, CalendarCheck2, Flame, LineChart, Radar } from "lucide-react";
import { LoadingState } from "@/components/primitives/loading-state";
import { Panel } from "@/components/primitives/panel";
import { TaskChip } from "@/components/primitives/task-chip";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { useAppData } from "@/features/app/app-data-context";
import { sortLeadsByPriority } from "@/features/leads/lead-query";
import { formatCurrencyAud, formatDateTime } from "@/lib/date";
import { isDueToday, isOverdue } from "@/lib/tasks/urgency";

export default function DashboardPage() {
  const { ready, leads, tasks, settings, updateTask } = useAppData();

  if (!ready || !settings) {
    return <LoadingState />;
  }

  const openTasks = tasks.filter((task) => task.status === "Open");
  const overdueTasks = openTasks.filter((task) => isOverdue(task));
  const dueTodayTasks = openTasks.filter((task) => isDueToday(task));
  const criticalQueue = openTasks.filter((task) => task.priority === "Critical").slice(0, 6);
  const topLeads = sortLeadsByPriority(leads).slice(0, 6);

  const staleThresholdMs = settings.staleThresholdDays * 86_400_000;
  const staleLeads = leads
    .filter((lead) => {
      const pivot = lead.lastTouchAt ? new Date(lead.lastTouchAt).getTime() : new Date(lead.createdAt).getTime();
      return Date.now() - pivot > staleThresholdMs;
    })
    .slice(0, 6);

  const activeLeads = leads.filter((lead) => !lead.archivedAt && lead.stage !== "ClosedLost" && lead.stage !== "NotAFit");
  const totalDealValue = activeLeads.reduce((sum, lead) => sum + (lead.dealValue || 0), 0);

  return (
    <div className="space-y-4">
      <Panel title="Pipeline Totals" subtitle="Active lead count + AUD value" actions={<LineChart className="h-4 w-4 text-cyan-300" />}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Active Leads</p>
            <p className="mt-2 text-2xl font-semibold text-slate-100">{activeLeads.length}</p>
          </div>
          <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Pipeline Value</p>
            <p className="mt-2 text-2xl font-semibold text-cyan-100">{formatCurrencyAud(totalDealValue)}</p>
          </div>
          <Link href="/tasks" className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 hover:border-cyan-400/60">
            <p className="text-xs uppercase tracking-wide text-slate-400">Open Tasks</p>
            <p className="mt-2 inline-flex items-center gap-2 text-2xl font-semibold text-slate-100">
              <CalendarCheck2 className="h-5 w-5 text-cyan-300" />
              {openTasks.length}
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
              overdueTasks.slice(0, 5).map((task) => (
                <TaskChip
                  key={task.id}
                  task={task}
                  onComplete={async () => {
                    await updateTask(task.id, { status: "Done" });
                  }}
                />
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
              dueTodayTasks.slice(0, 5).map((task) => (
                <TaskChip
                  key={task.id}
                  task={task}
                  onComplete={async () => {
                    await updateTask(task.id, { status: "Done" });
                  }}
                />
              ))
            ) : (
              <p className="text-sm text-slate-400">No tasks due today.</p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          title="Critical Queue"
          subtitle="High-risk open tasks"
          actions={<Flame className="h-4 w-4 text-red-300" />}
        >
          <div className="space-y-2">
            {criticalQueue.length ? (
              criticalQueue.map((task) => <TaskChip key={task.id} task={task} compact />)
            ) : (
              <p className="text-sm text-slate-400">No critical tasks right now.</p>
            )}
          </div>
        </Panel>

        <Panel title="Top Priority Leads" subtitle="Score + urgency blended" actions={<Radar className="h-4 w-4 text-cyan-300" />}>
          <div className="space-y-2">
            {topLeads.map((lead) => (
              <Link key={lead.id} href={`/leads/${lead.id}`} className="block rounded border border-slate-700/70 p-2 hover:border-cyan-400/60">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{lead.companyName}</p>
                  <ToneBadge
                    label={lead.priority}
                    tone={lead.priority === "Critical" ? "danger" : lead.priority === "High" ? "warn" : "default"}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">Score {lead.score} • Next {formatDateTime(lead.nextFollowUpAt)}</p>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Stale Leads" subtitle={`No touchpoint for ${settings.staleThresholdDays}+ days`} actions={<AlertTriangle className="h-4 w-4 text-amber-300" />}>
          <div className="space-y-2">
            {staleLeads.length ? (
              staleLeads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`} className="block rounded border border-slate-700/70 p-2 hover:border-amber-400/60">
                  <p className="text-sm font-semibold text-slate-100">{lead.companyName}</p>
                  <p className="mt-1 text-xs text-slate-400">Last touch {formatDateTime(lead.lastTouchAt)}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-400">No stale leads.</p>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
