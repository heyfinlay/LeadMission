"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LoadingState } from "@/components/primitives/loading-state";
import { Panel } from "@/components/primitives/panel";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useAppData } from "@/features/app/app-data-context";
import type { Budget, Priority, Stage } from "@/types/models";

export default function NewLeadPage() {
  const router = useRouter();
  const { ready, settings, createLead } = useAppData();
  const [companyName, setCompanyName] = useState("");
  const [stage, setStage] = useState<Stage>("Cold");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [budget, setBudget] = useState<Budget>("Unknown");
  const [dealValue, setDealValue] = useState("");

  if (!ready || !settings) {
    return <LoadingState />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    const lead = await createLead({
      companyName: companyName.trim(),
      stage,
      score: 50,
      priority,
      budget,
      dealValue: Number(dealValue || settings.defaultDealValue),
      intel: { leadId: "", painPoints: [], moneyLeaks: [], quickWins: [] },
      notes: "",
    });

    router.push(`/leads/${lead.id}`);
  };

  return (
    <Panel title="Create Lead" subtitle="Minimal intake. Move directly into lead HQ page.">
      <form onSubmit={(event) => void onSubmit(event)} className="grid max-w-2xl gap-4 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Company name</span>
          <Input required value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
        </label>

        <label>
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Stage</span>
          <Select
            value={stage}
            onChange={(event) => setStage(event.target.value as Stage)}
            options={[
              { label: "Cold", value: "Cold" },
              { label: "Researched", value: "Researched" },
              { label: "Contacted", value: "Contacted" },
              { label: "Warm", value: "Warm" },
              { label: "Qualified", value: "Qualified" },
              { label: "Proposal Sent", value: "ProposalSent" },
              { label: "Negotiation", value: "Negotiation" },
            ]}
          />
        </label>

        <label>
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Priority</span>
          <Select
            value={priority}
            onChange={(event) => setPriority(event.target.value as Priority)}
            options={[
              { label: "Low", value: "Low" },
              { label: "Medium", value: "Medium" },
              { label: "High", value: "High" },
              { label: "Critical", value: "Critical" },
            ]}
          />
        </label>

        <label>
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Budget</span>
          <Select
            value={budget}
            onChange={(event) => setBudget(event.target.value as Budget)}
            options={[
              { label: "Unknown", value: "Unknown" },
              { label: "Low", value: "Low" },
              { label: "Mid", value: "Mid" },
              { label: "High", value: "High" },
            ]}
          />
        </label>

        <label>
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Deal value (AUD)</span>
          <Input type="number" min={0} value={dealValue} onChange={(event) => setDealValue(event.target.value)} />
        </label>

        <div className="md:col-span-2">
          <UnderlitButton type="submit">Create and Open Lead</UnderlitButton>
        </div>
      </form>
    </Panel>
  );
}
