"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw } from "lucide-react";
import { Panel } from "@/components/primitives/panel";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/date";
import type { Json } from "@/types/supabase";

interface Company {
  id: string;
  business_name: string;
  website_url: string | null;
  industry: string | null;
  stage: string;
  priority: string;
  score: number;
  notes: string | null;
  client_email: string | null;
}

interface Scrape {
  id: string;
  url: string;
  summary: string | null;
  extracted_json: Json;
  created_at: string;
}

interface Audit {
  id: string;
  status: string;
  mode: "in_app" | "prompt";
  prompt: string | null;
  model_response: string | null;
  summary: string | null;
  created_at: string;
}

interface Proposal {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
}

interface PortalSettings {
  portal_enabled: boolean;
}

interface CompanyManageViewProps {
  company: Company;
  latestScrape: Scrape | null;
  audits: Audit[];
  proposals: Proposal[];
  tasks: Task[];
  portalSettings: PortalSettings | null;
}

const getKeyBullets = (value: Json): string[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  const bullets = (value as { keyBullets?: unknown }).keyBullets;
  if (!Array.isArray(bullets)) {
    return [];
  }

  return bullets.filter((item): item is string => typeof item === "string");
};

const getErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const candidate = payload as { error?: string; details?: string };
  if (candidate.error && candidate.details) {
    return `${candidate.error} (${candidate.details})`;
  }

  return candidate.error || fallback;
};

export const CompanyManageView = ({
  company,
  latestScrape,
  audits,
  proposals,
  tasks,
  portalSettings,
}: CompanyManageViewProps) => {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(company.business_name);
  const [websiteUrl, setWebsiteUrl] = useState(company.website_url || "");
  const [industry, setIndustry] = useState(company.industry || "");
  const [stage, setStage] = useState(company.stage);
  const [priority, setPriority] = useState(company.priority);
  const [score, setScore] = useState(company.score);
  const [notes, setNotes] = useState(company.notes || "");

  const [auditPrompt, setAuditPrompt] = useState("");
  const [promptAuditId, setPromptAuditId] = useState<string | undefined>();
  const [pastedAuditOutput, setPastedAuditOutput] = useState("");
  const [portalEnabled, setPortalEnabled] = useState(Boolean(portalSettings?.portal_enabled));
  const [clientEmail, setClientEmail] = useState(company.client_email || "");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueAt, setNewTaskDueAt] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const keyBullets = useMemo(() => (latestScrape ? getKeyBullets(latestScrape.extracted_json) : []), [latestScrape]);

  const runJsonRequest = async (label: string, input: () => Promise<Response>) => {
    setWorking(label);
    setError(null);
    setStatus(null);
    try {
      const response = await input();
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, `${label} failed.`));
      }
      return payload as { data?: unknown; prompt?: string };
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : `${label} failed.`;
      setError(message);
      return null;
    } finally {
      setWorking(null);
    }
  };

  const refreshWithStatus = (nextStatus: string) => {
    setStatus(nextStatus);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Panel title={company.business_name} subtitle="Company manage workspace">
        <div className="flex flex-wrap items-center gap-2">
          <ToneBadge label={stage} tone="info" />
          <ToneBadge
            label={priority}
            tone={priority === "Critical" ? "danger" : priority === "High" ? "warn" : "default"}
          />
          <Link href={`/companies/${company.id}/proposal`}>
            <UnderlitButton size="sm" variant="outline">Open Proposal Builder</UnderlitButton>
          </Link>
          <Link href={`/portal/${company.id}`}>
            <UnderlitButton size="sm" variant="outline">Open Client Portal</UnderlitButton>
          </Link>
        </div>
      </Panel>

      <Panel title="Company Details" subtitle="Editable account context">
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Business name</span>
            <Input value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
          </label>

          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Website</span>
            <Input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} />
          </label>

          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Industry</span>
            <Input value={industry} onChange={(event) => setIndustry(event.target.value)} />
          </label>

          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Score</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={score}
              onChange={(event) => setScore(Number(event.target.value || 0))}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Stage</span>
            <Select
              value={stage}
              onChange={(event) => setStage(event.target.value)}
              options={[
                { label: "Cold", value: "Cold" },
                { label: "Researched", value: "Researched" },
                { label: "Contacted", value: "Contacted" },
                { label: "Warm", value: "Warm" },
                { label: "Qualified", value: "Qualified" },
                { label: "ProposalSent", value: "ProposalSent" },
                { label: "Negotiation", value: "Negotiation" },
                { label: "ClosedWon", value: "ClosedWon" },
                { label: "ClosedLost", value: "ClosedLost" },
              ]}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Priority</span>
            <Select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              options={[
                { label: "Low", value: "Low" },
                { label: "Medium", value: "Medium" },
                { label: "High", value: "High" },
                { label: "Critical", value: "Critical" },
              ]}
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Notes</span>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} />
        </label>

        <div className="mt-3">
          <UnderlitButton
            disabled={working === "save-company"}
            onClick={async () => {
              const payload = await runJsonRequest("save-company", () =>
                fetch(`/api/companies/${company.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    businessName,
                    websiteUrl,
                    industry,
                    stage,
                    priority,
                    score,
                    notes,
                  }),
                }),
              );

              if (payload) {
                refreshWithStatus("Company updated.");
              }
            }}
          >
            {working === "save-company" ? "Saving..." : "Save Company"}
          </UnderlitButton>
        </div>
      </Panel>

      <Panel title="Website Scraper" subtitle="MVP scrape + summary storage">
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Scrape URL</span>
            <Input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} />
          </label>
          <UnderlitButton
            disabled={working === "scrape"}
            onClick={async () => {
              if (!websiteUrl) {
                setError("Add a valid website URL first.");
                return;
              }

              const payload = await runJsonRequest("scrape", () =>
                fetch("/api/scrape", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    companyId: company.id,
                    url: websiteUrl,
                  }),
                }),
              );

              if (payload) {
                refreshWithStatus("Website scrape stored.");
              }
            }}
          >
            {working === "scrape" ? "Scraping..." : "Scrape Website"}
          </UnderlitButton>
        </div>

        {latestScrape ? (
          <div className="mt-3 space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="text-xs text-slate-400">Last scrape: {formatDateTime(latestScrape.created_at)}</p>
            <p className="text-sm text-slate-200">{latestScrape.summary || "No summary available."}</p>
            {keyBullets.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                {keyBullets.slice(0, 6).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">No scrape yet.</p>
        )}
      </Panel>

      <Panel title="AI Audit Generator" subtitle="In-app generation + prompt fallback">
        <div className="flex flex-wrap gap-2">
          <UnderlitButton
            disabled={working === "audit-generate"}
            onClick={async () => {
              const payload = await runJsonRequest("audit-generate", () =>
                fetch("/api/audit/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    companyId: company.id,
                  }),
                }),
              );

              if (payload) {
                refreshWithStatus("In-app audit request completed.");
              }
            }}
          >
            {working === "audit-generate" ? "Generating..." : "Generate Inside App"}
          </UnderlitButton>

          <UnderlitButton
            variant="outline"
            disabled={working === "audit-prompt"}
            onClick={async () => {
              const payload = await runJsonRequest("audit-prompt", () =>
                fetch("/api/audit/prompt", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    companyId: company.id,
                  }),
                }),
              );

              if (payload?.prompt) {
                setAuditPrompt(payload.prompt);
              }

              const data = payload?.data as { id?: string } | undefined;
              if (data?.id) {
                setPromptAuditId(data.id);
              }

              if (payload) {
                refreshWithStatus("Prompt audit created.");
              }
            }}
          >
            {working === "audit-prompt" ? "Building Prompt..." : "Generate Prompt"}
          </UnderlitButton>
        </div>

        {auditPrompt ? (
          <div className="mt-3 space-y-2 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">Prompt output</p>
              <UnderlitButton
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(auditPrompt);
                  setStatus("Prompt copied to clipboard.");
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </UnderlitButton>
            </div>
            <Textarea value={auditPrompt} readOnly rows={10} />
          </div>
        ) : null}

        <div className="mt-3 rounded-lg border border-slate-700/60 bg-slate-900/40 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-100">Paste ChatGPT output and save</p>
          <Textarea
            rows={8}
            value={pastedAuditOutput}
            onChange={(event) => setPastedAuditOutput(event.target.value)}
            placeholder="Paste generated audit response..."
          />
          <div className="mt-2">
            <UnderlitButton
              variant="outline"
              disabled={working === "audit-save"}
              onClick={async () => {
                if (pastedAuditOutput.trim().length < 30) {
                  setError("Pasted audit output is too short.");
                  return;
                }

                const payload = await runJsonRequest("audit-save", () =>
                  fetch("/api/audit/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      companyId: company.id,
                      auditId: promptAuditId,
                      modelResponse: pastedAuditOutput,
                    }),
                  }),
                );

                if (payload) {
                  setPastedAuditOutput("");
                  refreshWithStatus("Pasted audit saved.");
                }
              }}
            >
              {working === "audit-save" ? "Saving..." : "Save Pasted Audit"}
            </UnderlitButton>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {audits.length > 0 ? audits.map((audit) => (
            <article key={audit.id} className="rounded-md border border-slate-700/60 bg-slate-900/35 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ToneBadge label={audit.mode} tone="info" />
                  <ToneBadge label={audit.status} tone={audit.status.includes("failed") ? "danger" : "default"} />
                </div>
                <span className="text-xs text-slate-400">{formatDateTime(audit.created_at)}</span>
              </div>
              <p className="text-sm text-slate-200">{audit.summary || "No summary."}</p>
              {audit.model_response ? (
                <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap rounded bg-slate-950/60 p-2 text-xs text-slate-200">
                  {audit.model_response}
                </pre>
              ) : null}
            </article>
          )) : <p className="text-sm text-slate-400">No audits yet.</p>}
        </div>
      </Panel>

      <Panel title="Proposal Builder" subtitle="Scaffolded proposal creation and editing">
        <div className="flex flex-wrap gap-2">
          <UnderlitButton
            disabled={working === "proposal-generate"}
            onClick={async () => {
              const payload = await runJsonRequest("proposal-generate", () =>
                fetch("/api/proposal/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    companyId: company.id,
                  }),
                }),
              );

              if (payload) {
                refreshWithStatus("Proposal scaffold generated.");
              }
            }}
          >
            {working === "proposal-generate" ? "Generating..." : "Generate Proposal from Audit"}
          </UnderlitButton>

          <Link href={`/companies/${company.id}/proposal`}>
            <UnderlitButton variant="outline">Open Proposal Editor</UnderlitButton>
          </Link>
        </div>

        <div className="mt-3 space-y-2">
          {proposals.length > 0 ? proposals.map((proposal) => (
            <article key={proposal.id} className="rounded-md border border-slate-700/60 bg-slate-900/35 p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-100">{proposal.title}</p>
                <span className="text-xs text-slate-400">{formatDateTime(proposal.created_at)}</span>
              </div>
              <ToneBadge label={proposal.status} tone="default" />
            </article>
          )) : <p className="text-sm text-slate-400">No proposals yet.</p>}
        </div>
      </Panel>

      <Panel title="Client Portal Access" subtitle="Enable portal and assign client identity">
        <div className="space-y-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={portalEnabled}
              onChange={(event) => setPortalEnabled(event.target.checked)}
            />
            Enable portal
          </label>

          <label className="block max-w-lg">
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Assign client email</span>
            <Input
              type="email"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
              placeholder="client@company.com"
            />
          </label>

          <UnderlitButton
            disabled={working === "portal-update"}
            onClick={async () => {
              const payload = await runJsonRequest("portal-update", () =>
                fetch("/api/companies/portal", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    companyId: company.id,
                    portalEnabled,
                    clientEmail,
                  }),
                }),
              );

              if (payload) {
                refreshWithStatus("Portal settings updated.");
              }
            }}
          >
            {working === "portal-update" ? "Saving..." : "Save Portal Settings"}
          </UnderlitButton>
        </div>
      </Panel>

      <Panel title="Tasks" subtitle="Optional read-only portal signal + quick add">
        <form
          className="mb-3 grid gap-2 border-b border-slate-700/60 pb-3 md:grid-cols-[1fr_180px_160px_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              if (!newTaskTitle.trim()) {
                setError("Task title is required.");
                return;
              }

              const payload = await runJsonRequest("task-create", () =>
                fetch("/api/tasks", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    companyId: company.id,
                    title: newTaskTitle,
                    dueAt: newTaskDueAt ? new Date(newTaskDueAt).toISOString() : undefined,
                    priority: newTaskPriority,
                  }),
                }),
              );

              if (payload) {
                setNewTaskTitle("");
                setNewTaskDueAt("");
                refreshWithStatus("Task created.");
              }
            })();
          }}
        >
          <Input
            value={newTaskTitle}
            onChange={(event) => setNewTaskTitle(event.target.value)}
            placeholder="New task title..."
          />
          <Input
            type="datetime-local"
            value={newTaskDueAt}
            onChange={(event) => setNewTaskDueAt(event.target.value)}
          />
          <Select
            value={newTaskPriority}
            onChange={(event) => setNewTaskPriority(event.target.value)}
            options={[
              { label: "low", value: "low" },
              { label: "medium", value: "medium" },
              { label: "high", value: "high" },
              { label: "critical", value: "critical" },
            ]}
          />
          <UnderlitButton type="submit" variant="outline">Add Task</UnderlitButton>
        </form>

        <div className="space-y-2">
          {tasks.length > 0 ? tasks.map((task) => (
            <article key={task.id} className="rounded-md border border-slate-700/60 bg-slate-900/35 p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-100">{task.title}</p>
                <div className="flex items-center gap-2">
                  <ToneBadge label={task.priority} tone={task.priority.toLowerCase() === "critical" ? "danger" : "default"} />
                  <ToneBadge label={task.status} tone={task.status.toLowerCase() === "done" ? "success" : "info"} />
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">{task.due_at ? `Due ${formatDateTime(task.due_at)}` : "No due date"}</p>
            </article>
          )) : <p className="text-sm text-slate-400">No tasks yet.</p>}
        </div>
      </Panel>

      {status ? (
        <div className="fixed bottom-4 right-4 z-40 rounded-md border border-emerald-500/30 bg-emerald-900/70 px-3 py-2 text-sm text-emerald-100">
          {status}
          <button
            type="button"
            onClick={() => setStatus(null)}
            className="ml-2 inline-flex items-center text-xs text-emerald-200 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="fixed bottom-4 left-4 z-40 rounded-md border border-red-500/40 bg-red-950/80 px-3 py-2 text-sm text-red-100">
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2 text-xs text-red-200 hover:text-white">
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
};

