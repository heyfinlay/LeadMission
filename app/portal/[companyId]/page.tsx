import { notFound } from "next/navigation";
import { Panel } from "@/components/primitives/panel";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { getCompanyById, getCompanyTasks, getLatestAudit, getLatestProposal, getPortalSettings } from "@/lib/companies/queries";
import { formatDateTime } from "@/lib/date";
import { createServerAuthClient, requireUser } from "@/lib/supabase/auth";

export default async function CompanyPortalPage({ params }: { params: Promise<{ companyId: string }> }) {
  const user = await requireUser();
  const resolvedParams = await params;
  const supabase = await createServerAuthClient();

  const [companyResult, portalResult, auditResult, proposalResult, tasksResult] = await Promise.all([
    getCompanyById(supabase, resolvedParams.companyId),
    getPortalSettings(supabase, resolvedParams.companyId),
    getLatestAudit(supabase, resolvedParams.companyId),
    getLatestProposal(supabase, resolvedParams.companyId),
    getCompanyTasks(supabase, resolvedParams.companyId, 20),
  ]);

  if (companyResult.error || !companyResult.data) {
    notFound();
  }

  const company = companyResult.data;
  const isOwner = company.owner_user_id === user.id;
  const isClient = company.client_user_id === user.id;
  const portalEnabled = portalResult.data?.portal_enabled ?? false;

  if (!portalEnabled || (!isOwner && !isClient)) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <Panel title={`${company.business_name} Portal`} subtitle="Client-facing delivery snapshot">
        <div className="flex flex-wrap items-center gap-2">
          <ToneBadge label={company.stage} tone="info" />
          <ToneBadge label={company.priority} tone={company.priority === "Critical" ? "danger" : "default"} />
          <ToneBadge label="Portal Enabled" tone="success" />
        </div>
        <p className="mt-3 text-sm text-slate-300">{company.notes || "No company overview provided yet."}</p>
      </Panel>

      <Panel title="Latest Audit" subtitle="Most recent generated or imported audit">
        {auditResult.data ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Created {formatDateTime(auditResult.data.created_at)}</p>
            <p className="text-sm text-slate-200">{auditResult.data.summary || "No summary available."}</p>
            {auditResult.data.model_response ? (
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-slate-950/60 p-3 text-xs text-slate-200">
                {auditResult.data.model_response}
              </pre>
            ) : (
              <p className="text-sm text-slate-400">Audit content has not been finalized yet.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No audit has been generated yet.</p>
        )}
      </Panel>

      <Panel title="Latest Proposal" subtitle="Current commercial draft">
        {proposalResult.data ? (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Created {formatDateTime(proposalResult.data.created_at)}</p>
            <h3 className="text-base font-semibold text-slate-100">{proposalResult.data.title}</h3>
            {proposalResult.data.html ? (
              <div className="prose prose-invert max-w-none rounded-md border border-slate-700/60 bg-slate-900/40 p-3" dangerouslySetInnerHTML={{ __html: proposalResult.data.html }} />
            ) : (
              <p className="text-sm text-slate-400">No rendered proposal content yet.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No proposal exists yet.</p>
        )}
      </Panel>

      <Panel title="Implementation Status" subtitle="Placeholder delivery status">
        <p className="text-sm text-slate-300">
          Implementation tracking is scaffolded. Add milestones, blockers, and ownership in the next phase.
        </p>
      </Panel>

      <Panel title="Key Tasks" subtitle="Read-only task queue">
        <div className="space-y-2">
          {(tasksResult.data || []).length > 0 ? (
            (tasksResult.data || []).map((task) => (
              <article key={task.id} className="rounded-md border border-slate-700/60 bg-slate-900/35 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-100">{task.title}</p>
                  <div className="flex items-center gap-2">
                    <ToneBadge label={task.priority} tone={task.priority.toLowerCase() === "critical" ? "danger" : "default"} />
                    <ToneBadge label={task.status} tone={task.status.toLowerCase() === "done" ? "success" : "info"} />
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-400">{task.due_at ? `Due ${formatDateTime(task.due_at)}` : "No due date set"}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-400">No tasks available.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}

