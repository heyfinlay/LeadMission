"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { LoadingState } from "@/components/primitives/loading-state";
import { Panel } from "@/components/primitives/panel";
import { ToneBadge } from "@/components/primitives/tone-badge";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAppData } from "@/features/app/app-data-context";
import { filterLeads } from "@/features/leads/lead-query";
import { formatCurrencyAud, formatDateTime } from "@/lib/date";
import { STAGES } from "@/types/models";

export default function LeadsPage() {
  const { ready, leads } = useAppData();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<(typeof STAGES)[number] | "All">("All");

  const filtered = useMemo(() => filterLeads(leads, { search, stage }), [leads, search, stage]);

  if (!ready) {
    return <LoadingState />;
  }

  return (
    <Panel title="Lead Index" subtitle="Table-first scanning and command routing">
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, contact, industry..." />
        <Select
          value={stage}
          onChange={(event) => setStage(event.target.value as (typeof STAGES)[number] | "All")}
          options={[{ label: "All Stages", value: "All" }, ...STAGES.map((item) => ({ label: item, value: item }))]}
        />
        <Link href="/leads/new">
          <UnderlitButton className="w-full">Create Lead</UnderlitButton>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-700/70 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-2 py-2">Company</th>
              <th className="px-2 py-2">Stage</th>
              <th className="px-2 py-2">Score</th>
              <th className="px-2 py-2">Priority</th>
              <th className="px-2 py-2">Next Follow-up</th>
              <th className="px-2 py-2">Deal Value</th>
              <th className="px-2 py-2">Last Touch</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr key={lead.id} className="border-b border-slate-800/70 hover:bg-slate-800/40">
                <td className="px-2 py-3 font-semibold text-slate-100">
                  <Link href={`/leads/${lead.id}`} className="hover:text-cyan-200">
                    {lead.companyName}
                  </Link>
                  <div className="mt-1">
                    <Link
                      href={`/leads/${lead.id}?view=preview`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-cyan-300 hover:text-cyan-200"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Link>
                  </div>
                </td>
                <td className="px-2 py-3">{lead.stage}</td>
                <td className="px-2 py-3">{lead.score}</td>
                <td className="px-2 py-3">
                  <ToneBadge
                    label={lead.priority}
                    tone={lead.priority === "Critical" ? "danger" : lead.priority === "High" ? "warn" : "default"}
                  />
                </td>
                <td className="px-2 py-3 text-slate-300">{formatDateTime(lead.nextFollowUpAt)}</td>
                <td className="px-2 py-3 text-cyan-100">{formatCurrencyAud(lead.dealValue)}</td>
                <td className="px-2 py-3 text-slate-300">{formatDateTime(lead.lastTouchAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
