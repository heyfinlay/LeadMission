"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowDown, Eye, Plus, Send, Settings2 } from "lucide-react";
import { EditableList } from "@/components/primitives/editable-list";
import { InlineEditField } from "@/components/primitives/inline-edit-field";
import { LoadingState } from "@/components/primitives/loading-state";
import { Meter } from "@/components/primitives/meter";
import { Panel } from "@/components/primitives/panel";
import { TaskChip } from "@/components/primitives/task-chip";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAppData } from "@/features/app/app-data-context";
import { formatCurrencyAud, formatDateTime, fromLocalDateTimeInput, toLocalDateTimeInput } from "@/lib/date";
import { clampScore } from "@/lib/lead-utils";
import { BUDGETS, OFFER_TIERS, PRIORITIES, STAGES, type Priority, type TouchpointType } from "@/types/models";

const jumpTo = (sectionId: string): void => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

const normalizeValue = (value?: string): string => (value && value.trim() ? value : "Not specified");

export default function LeadDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const searchParams = useSearchParams();
  const viewMode = searchParams.get("view") === "preview" ? "preview" : "manage";

  const leadId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { ready, leads, tasks, touchpoints, updateLead, createTask, updateTask, createTouchpoint } = useAppData();

  const lead = useMemo(() => leads.find((item) => item.id === leadId), [leads, leadId]);

  const leadTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.leadId === leadId)
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()),
    [tasks, leadId],
  );

  const leadTouchpoints = useMemo(
    () =>
      touchpoints
        .filter((touchpoint) => touchpoint.leadId === leadId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [touchpoints, leadId],
  );

  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("Medium");
  const [touchType, setTouchType] = useState<TouchpointType>("call");
  const [touchContent, setTouchContent] = useState("");

  if (!ready) {
    return <LoadingState />;
  }

  if (!lead) {
    return <LoadingState label="Lead not found." />;
  }

  const stageIndex = STAGES.indexOf(lead.stage);
  const nextStage = stageIndex >= 0 && stageIndex < STAGES.length - 1 ? STAGES[stageIndex + 1] : undefined;

  return (
    <div className="space-y-4">
      <Panel className="border-cyan-500/30 bg-[linear-gradient(180deg,rgba(8,34,41,0.62),rgba(10,14,21,0.95))]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/80">Lead Workspace</p>
            <h1 className="text-xl font-semibold text-slate-100">{lead.companyName}</h1>
          </div>
          <div className="inline-flex rounded-md border border-slate-700/70 bg-slate-900/60 p-1">
            <Link
              href={`/leads/${lead.id}`}
              className={`inline-flex items-center gap-1 rounded px-3 py-1 text-sm transition-colors ${
                viewMode === "manage" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:text-cyan-200"
              }`}
            >
              <Settings2 className="h-4 w-4" />
              Manage
            </Link>
            <Link
              href={`/leads/${lead.id}?view=preview`}
              className={`inline-flex items-center gap-1 rounded px-3 py-1 text-sm transition-colors ${
                viewMode === "preview" ? "bg-cyan-500/20 text-cyan-100" : "text-slate-300 hover:text-cyan-200"
              }`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Link>
          </div>
        </div>
      </Panel>

      {viewMode === "preview" ? (
        <div className="space-y-4">
          <Panel title="Company Portfolio" subtitle="Presentation view for call reviews and client context.">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">{lead.companyName}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ToneBadge label={lead.stage} tone="info" />
                  <ToneBadge
                    label={lead.priority}
                    tone={lead.priority === "Critical" ? "danger" : lead.priority === "High" ? "warn" : "default"}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-300">Pipeline value {formatCurrencyAud(lead.dealValue)}</p>
              </div>
              <Meter value={lead.score} label="Engagement Score" />
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Key Contact Details">
              <div className="grid gap-2 text-sm text-slate-200">
                <p><span className="text-slate-400">Contact:</span> {normalizeValue(lead.contactName)}</p>
                <p><span className="text-slate-400">Role:</span> {normalizeValue(lead.contactRole)}</p>
                <p><span className="text-slate-400">Email:</span> {normalizeValue(lead.contactEmail)}</p>
                <p><span className="text-slate-400">Phone:</span> {normalizeValue(lead.contactPhone)}</p>
                <p><span className="text-slate-400">Website:</span> {normalizeValue(lead.website)}</p>
              </div>
            </Panel>

            <Panel title="Timeline & Follow-up">
              <div className="space-y-2 text-sm text-slate-200">
                <p><span className="text-slate-400">Last touch:</span> {formatDateTime(lead.lastTouchAt)}</p>
                <p><span className="text-slate-400">Next follow-up:</span> {formatDateTime(lead.nextFollowUpAt)}</p>
                <p><span className="text-slate-400">Current stage:</span> {lead.stage}</p>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Overview / Notes">
              <p className="whitespace-pre-wrap text-sm text-slate-200">{lead.notes || "No overview captured yet."}</p>
            </Panel>

            <Panel title="Services & Scope">
              <div className="space-y-2 text-sm text-slate-200">
                <p><span className="text-slate-400">Services interested:</span> {normalizeValue(lead.servicesInterested)}</p>
                <p><span className="text-slate-400">System scope:</span> {normalizeValue(lead.systemScope)}</p>
              </div>
            </Panel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Implementation Status / Next Steps">
              <div className="space-y-2 text-sm text-slate-200">
                <p><span className="text-slate-400">Implementation status:</span> {normalizeValue(lead.implementationStatus)}</p>
                <p className="whitespace-pre-wrap"><span className="text-slate-400">Next steps:</span> {normalizeValue(lead.nextSteps)}</p>
              </div>
            </Panel>

            <Panel title="Recent Timeline Entries">
              <div className="space-y-2">
                {leadTouchpoints.length ? (
                  leadTouchpoints.slice(0, 6).map((touchpoint) => (
                    <article key={touchpoint.id} className="rounded-md border border-slate-700/60 bg-slate-900/40 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <ToneBadge label={touchpoint.type} tone="info" />
                        <span className="text-xs text-slate-400">{formatDateTime(touchpoint.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-200">{touchpoint.content}</p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No touchpoints yet.</p>
                )}
              </div>
            </Panel>
          </div>

          <Panel title="Related Tasks" subtitle="Task status and due dates for this company.">
            <div className="space-y-2">
              {leadTasks.length ? (
                leadTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="block rounded-md border border-slate-700/60 bg-slate-900/40 p-3 transition-colors hover:border-cyan-400/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">{task.title}</p>
                        <p className="mt-1 text-xs text-slate-400">Due {formatDateTime(task.dueAt)}</p>
                      </div>
                      <ToneBadge label={task.status} tone={task.status === "Done" ? "success" : "info"} />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-400">No tasks linked to this lead.</p>
              )}
            </div>
          </Panel>
        </div>
      ) : (
        <>
          <Panel className="sticky top-[68px] z-10 border-cyan-500/35 bg-[linear-gradient(180deg,rgba(8,34,41,0.72),rgba(10,14,21,0.95))]">
            <div className="grid gap-3 lg:grid-cols-12">
              <InlineEditField
                label="Company"
                value={lead.companyName}
                onCommit={(value) => updateLead(lead.id, { companyName: value.trim() })}
                className="lg:col-span-3"
              />
              <InlineEditField
                label="Stage"
                type="select"
                value={lead.stage}
                options={STAGES.map((item) => ({ label: item, value: item }))}
                onCommit={(value) => updateLead(lead.id, { stage: value as (typeof STAGES)[number] })}
                className="lg:col-span-2"
              />
              <InlineEditField
                label="Score"
                type="number"
                value={lead.score}
                onCommit={(value) => updateLead(lead.id, { score: clampScore(Number(value)) })}
                className="lg:col-span-1"
              />
              <InlineEditField
                label="Priority"
                type="select"
                value={lead.priority}
                options={PRIORITIES.map((item) => ({ label: item, value: item }))}
                onCommit={(value) => updateLead(lead.id, { priority: value as (typeof PRIORITIES)[number] })}
                className="lg:col-span-2"
              />
              <InlineEditField
                label="Budget"
                type="select"
                value={lead.budget}
                options={BUDGETS.map((item) => ({ label: item, value: item }))}
                onCommit={(value) => updateLead(lead.id, { budget: value as (typeof BUDGETS)[number] })}
                className="lg:col-span-2"
              />
              <InlineEditField
                label="Deal Value (AUD)"
                type="number"
                value={lead.dealValue}
                onCommit={(value) => updateLead(lead.id, { dealValue: Number(value) || 0 })}
                className="lg:col-span-2"
              />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <InlineEditField
                label="Next Follow-up"
                type="datetime-local"
                value={toLocalDateTimeInput(lead.nextFollowUpAt)}
                onCommit={(value) => updateLead(lead.id, { nextFollowUpAt: fromLocalDateTimeInput(value) })}
              />
              <div className="flex flex-wrap items-center gap-2">
                <UnderlitButton variant="outline" size="sm" onClick={() => jumpTo("lead-task-form")}>Add Task</UnderlitButton>
                <UnderlitButton variant="outline" size="sm" onClick={() => jumpTo("lead-touchpoint-form")}>Log Touchpoint</UnderlitButton>
                <UnderlitButton
                  size="sm"
                  disabled={!nextStage}
                  onClick={() => {
                    if (nextStage) {
                      void updateLead(lead.id, { stage: nextStage });
                    }
                  }}
                >
                  <ArrowDown className="h-4 w-4" />
                  {nextStage ? `Progress to ${nextStage}` : "Final Stage"}
                </UnderlitButton>
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <Panel title="Company Intel" subtitle="Inline editable operating context">
              <div className="grid gap-3 md:grid-cols-2">
                <InlineEditField
                  label="Website"
                  type="url"
                  value={lead.website}
                  onCommit={(value) => updateLead(lead.id, { website: value || undefined })}
                />
                <InlineEditField
                  label="Industry"
                  value={lead.industry}
                  onCommit={(value) => updateLead(lead.id, { industry: value || undefined })}
                />
                <InlineEditField
                  label="Location"
                  value={lead.location}
                  onCommit={(value) => updateLead(lead.id, { location: value || undefined })}
                />
                <InlineEditField
                  label="Contact Name"
                  value={lead.contactName}
                  onCommit={(value) => updateLead(lead.id, { contactName: value || undefined })}
                />
                <InlineEditField
                  label="Role"
                  value={lead.contactRole}
                  onCommit={(value) => updateLead(lead.id, { contactRole: value || undefined })}
                />
                <InlineEditField
                  label="Email"
                  type="email"
                  value={lead.contactEmail}
                  onCommit={(value) => updateLead(lead.id, { contactEmail: value || undefined })}
                />
                <InlineEditField
                  label="Phone"
                  type="tel"
                  value={lead.contactPhone}
                  onCommit={(value) => updateLead(lead.id, { contactPhone: value || undefined })}
                />
                <InlineEditField
                  label="Offer Tier"
                  type="select"
                  value={lead.offerMatchTier || "Tier1"}
                  options={OFFER_TIERS.map((tier) => ({ label: tier, value: tier }))}
                  onCommit={(value) => updateLead(lead.id, { offerMatchTier: value as (typeof OFFER_TIERS)[number] })}
                />
              </div>
            </Panel>

            <Panel title="Status Snapshot" subtitle="Live priority posture">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Stage</span>
                  <ToneBadge label={lead.stage} tone="info" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Priority</span>
                  <ToneBadge
                    label={lead.priority}
                    tone={lead.priority === "Critical" ? "danger" : lead.priority === "High" ? "warn" : "default"}
                  />
                </div>
                <div className="text-sm text-slate-300">Deal {formatCurrencyAud(lead.dealValue)}</div>
                <div className="text-sm text-slate-300">Last touch {formatDateTime(lead.lastTouchAt)}</div>
                <Meter value={lead.score} label="Lead Score" />
              </div>
            </Panel>
          </div>

          <Panel title="Portfolio Framing" subtitle="Fields used by preview and call review views.">
            <div className="grid gap-3 md:grid-cols-2">
              <InlineEditField
                label="Services Interested"
                type="textarea"
                value={lead.servicesInterested || ""}
                onCommit={(value) => updateLead(lead.id, { servicesInterested: value || undefined })}
              />
              <InlineEditField
                label="System Scope"
                type="textarea"
                value={lead.systemScope || ""}
                onCommit={(value) => updateLead(lead.id, { systemScope: value || undefined })}
              />
              <InlineEditField
                label="Implementation Status"
                value={lead.implementationStatus || ""}
                onCommit={(value) => updateLead(lead.id, { implementationStatus: value || undefined })}
              />
              <InlineEditField
                label="Next Steps"
                type="textarea"
                value={lead.nextSteps || ""}
                onCommit={(value) => updateLead(lead.id, { nextSteps: value || undefined })}
              />
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="Pain Points">
              <EditableList
                label="Pain Points"
                items={lead.intel.painPoints}
                onCommit={async (next) => {
                  await updateLead(lead.id, { intel: { ...lead.intel, painPoints: next } });
                }}
              />
            </Panel>
            <Panel title="Money Leaks">
              <EditableList
                label="Money Leaks"
                items={lead.intel.moneyLeaks}
                onCommit={async (next) => {
                  await updateLead(lead.id, { intel: { ...lead.intel, moneyLeaks: next } });
                }}
              />
            </Panel>
            <Panel title="Quick Wins">
              <EditableList
                label="Quick Wins"
                items={lead.intel.quickWins}
                onCommit={async (next) => {
                  await updateLead(lead.id, { intel: { ...lead.intel, quickWins: next } });
                }}
              />
            </Panel>
          </div>

          <Panel title="Notes" subtitle="Longform meeting and strategy notes">
            <InlineEditField
              label="Lead Notes"
              type="textarea"
              value={lead.notes || ""}
              onCommit={(value) => updateLead(lead.id, { notes: value })}
              placeholder="Capture call detail, objections, decisions, and commitments..."
              className="min-h-[180px]"
            />
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel id="lead-touchpoint-form" title="Timeline" subtitle="Reverse chronological touchpoints">
              <form
                className="mb-3 flex flex-col gap-2 border-b border-slate-700/70 pb-3 md:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const content = touchContent.trim();
                  if (!content) {
                    return;
                  }

                  void createTouchpoint({
                    leadId: lead.id,
                    type: touchType,
                    content,
                  }).then(() => setTouchContent(""));
                }}
              >
                <Select
                  value={touchType}
                  onChange={(event) => setTouchType(event.target.value as TouchpointType)}
                  options={[
                    { label: "Call", value: "call" },
                    { label: "Email", value: "email" },
                    { label: "DM", value: "dm" },
                    { label: "Note", value: "note" },
                  ]}
                  className="md:w-[150px]"
                />
                <Input value={touchContent} onChange={(event) => setTouchContent(event.target.value)} placeholder="Log touchpoint..." />
                <UnderlitButton type="submit" className="md:w-auto">
                  <Send className="h-4 w-4" />
                  Log
                </UnderlitButton>
              </form>

              <div className="space-y-2">
                {leadTouchpoints.length ? (
                  leadTouchpoints.map((touchpoint) => (
                    <article key={touchpoint.id} className="rounded-md border border-slate-700/60 bg-slate-900/40 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <ToneBadge label={touchpoint.type} tone="info" />
                        <span className="text-xs text-slate-400">{formatDateTime(touchpoint.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-200">{touchpoint.content}</p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No touchpoints yet.</p>
                )}
              </div>
            </Panel>

            <Panel id="lead-task-form" title="Lead Tasks" subtitle="Inline task creation linked to this lead">
              <form
                className="mb-3 grid gap-2 border-b border-slate-700/70 pb-3 md:grid-cols-[1fr_170px_130px_auto]"
                onSubmit={(event) => {
                  event.preventDefault();
                  const title = taskTitle.trim();
                  if (!title) {
                    return;
                  }

                  void createTask({
                    leadId: lead.id,
                    title,
                    description: taskDescription.trim() || undefined,
                    dueAt: fromLocalDateTimeInput(taskDueAt) || new Date().toISOString(),
                    priority: taskPriority,
                  }).then(() => {
                    setTaskTitle("");
                    setTaskDescription("");
                  });
                }}
              >
                <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="New task..." required />
                <Input type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} required />
                <Select
                  value={taskPriority}
                  onChange={(event) => setTaskPriority(event.target.value as Priority)}
                  options={PRIORITIES.map((priority) => ({ label: priority, value: priority }))}
                />
                <UnderlitButton type="submit">
                  <Plus className="h-4 w-4" />
                  Add
                </UnderlitButton>
                <Input
                  value={taskDescription}
                  onChange={(event) => setTaskDescription(event.target.value)}
                  placeholder="Task description (optional)..."
                  className="md:col-span-4"
                />
              </form>

              <div className="space-y-2">
                {leadTasks.length ? (
                  leadTasks.map((task) => (
                    <div key={task.id} className="rounded-lg border border-slate-700/60 bg-slate-900/30 p-2">
                      <TaskChip
                        task={task}
                        onComplete={async () => {
                          await updateTask(task.id, { status: "Done" });
                        }}
                      />
                      <div className="mt-1 px-1">
                        <Link href={`/tasks/${task.id}`} className="text-xs text-cyan-300 hover:text-cyan-200">Open task detail</Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No tasks linked to this lead.</p>
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
