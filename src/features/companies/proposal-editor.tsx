"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/primitives/panel";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Json } from "@/types/supabase";

interface Section {
  heading: string;
  body: string;
}

interface ProposalRecord {
  id: string;
  title: string;
  status: string;
  sections_json: Json;
  created_at: string;
}

interface ProposalEditorProps {
  companyId: string;
  companyName: string;
  latestAuditSummary: string | null;
  proposal: ProposalRecord | null;
}

const parseSections = (value: Json, fallbackText: string): Section[] => {
  if (Array.isArray(value)) {
    const sections = value
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }

        const heading = (item as { heading?: unknown }).heading;
        const body = (item as { body?: unknown }).body;
        if (typeof heading !== "string" || typeof body !== "string") {
          return null;
        }

        return {
          heading,
          body,
        };
      })
      .filter((item): item is Section => Boolean(item));

    if (sections.length > 0) {
      return sections;
    }
  }

  return [
    {
      heading: "Executive Summary",
      body: fallbackText,
    },
  ];
};

export const ProposalEditor = ({ companyId, companyName, latestAuditSummary, proposal }: ProposalEditorProps) => {
  const router = useRouter();
  const [proposalId, setProposalId] = useState<string | undefined>(proposal?.id);
  const [title, setTitle] = useState(proposal?.title || `${companyName} Proposal`);
  const [status, setStatus] = useState(proposal?.status || "draft");
  const [sections, setSections] = useState<Section[]>(
    parseSections(proposal?.sections_json || [], latestAuditSummary || "Audit summary not available yet."),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const previewHtml = useMemo(
    () =>
      sections
        .map(
          (section) =>
            `<section><h2>${section.heading.replace(/</g, "&lt;")}</h2><p>${section.body
              .replace(/</g, "&lt;")
              .replace(/\n/g, "<br/>")}</p></section>`,
        )
        .join(""),
    [sections],
  );

  return (
    <div className="space-y-4">
      <Panel title={`${companyName} Proposal`} subtitle="Template scaffold + editable sections">
        <div className="flex flex-wrap items-center gap-2">
          <UnderlitButton
            disabled={working === "generate"}
            onClick={async () => {
              setWorking("generate");
              setError(null);
              setNotice(null);
              try {
                const response = await fetch("/api/proposal/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    companyId,
                  }),
                });
                const payload = (await response.json().catch(() => null)) as {
                  data?: { id?: string; title?: string; status?: string; sections_json?: Json };
                  error?: string;
                } | null;

                if (!response.ok || !payload?.data) {
                  throw new Error(payload?.error || "Could not generate proposal scaffold.");
                }

                setProposalId(payload.data.id);
                setTitle(payload.data.title || title);
                setStatus(payload.data.status || "draft");
                setSections(parseSections(payload.data.sections_json || [], latestAuditSummary || ""));
                setNotice("Proposal scaffold generated from latest audit.");
                router.refresh();
              } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "Could not generate proposal scaffold.");
              } finally {
                setWorking(null);
              }
            }}
          >
            {working === "generate" ? "Generating..." : "Generate Proposal from Audit"}
          </UnderlitButton>
        </div>
      </Panel>

      <Panel title="Editor" subtitle="Sections are stored as JSON + rendered HTML">
        <div className="grid gap-3 md:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Title</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Status</span>
            <Input value={status} onChange={(event) => setStatus(event.target.value)} />
          </label>
        </div>

        <div className="mt-3 space-y-3">
          {sections.map((section, index) => (
            <article key={`${section.heading}-${index}`} className="rounded-md border border-slate-700/70 bg-slate-900/35 p-3">
              <label className="mb-2 block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Heading</span>
                <Input
                  value={section.heading}
                  onChange={(event) => {
                    setSections((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, heading: event.target.value } : item,
                      ),
                    );
                  }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Body</span>
                <Textarea
                  rows={6}
                  value={section.body}
                  onChange={(event) => {
                    setSections((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, body: event.target.value } : item,
                      ),
                    );
                  }}
                />
              </label>
            </article>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <UnderlitButton
            variant="outline"
            onClick={() => setSections((current) => [...current, { heading: "New Section", body: "" }])}
          >
            Add Section
          </UnderlitButton>
          <UnderlitButton
            disabled={working === "save"}
            onClick={async () => {
              setWorking("save");
              setError(null);
              setNotice(null);
              try {
                const response = await fetch("/api/proposal/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    companyId,
                    proposalId,
                    title,
                    status,
                    sections,
                  }),
                });

                const payload = (await response.json().catch(() => null)) as {
                  data?: { id?: string };
                  error?: string;
                } | null;
                if (!response.ok || !payload?.data) {
                  throw new Error(payload?.error || "Could not save proposal.");
                }

                if (payload.data.id) {
                  setProposalId(payload.data.id);
                }

                setNotice("Proposal saved.");
                router.refresh();
              } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "Could not save proposal.");
              } finally {
                setWorking(null);
              }
            }}
          >
            {working === "save" ? "Saving..." : "Save Proposal"}
          </UnderlitButton>
        </div>
      </Panel>

      <Panel title="HTML Preview" subtitle="Stored `html` representation">
        <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
      </Panel>

      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
};

