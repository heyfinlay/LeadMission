"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Panel } from "@/components/primitives/panel";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function NewCompanyPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("Cold");
  const [priority, setPriority] = useState("Medium");
  const [score, setScore] = useState(50);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/companies", {
      method: "POST",
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
    });

    const payload = (await response.json()) as { data?: { id: string }; error?: string };
    if (!response.ok || !payload.data?.id) {
      setError(payload.error || "Could not create company.");
      setSaving(false);
      return;
    }

    router.push(`/companies/${payload.data.id}`);
    router.refresh();
  };

  return (
    <Panel title="Create Company" subtitle="Supabase-backed account intake">
      <form onSubmit={(event) => void onSubmit(event)} className="grid max-w-3xl gap-4 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Business name</span>
          <Input required value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
        </label>

        <label>
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Website</span>
          <Input type="url" placeholder="https://example.com" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} />
        </label>

        <label>
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Industry</span>
          <Input value={industry} onChange={(event) => setIndustry(event.target.value)} />
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

        <label>
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Score (0-100)</span>
          <Input type="number" min={0} max={100} value={score} onChange={(event) => setScore(Number(event.target.value || 0))} />
        </label>

        <label className="md:col-span-2">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Notes</span>
          <Textarea rows={5} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>

        {error ? <p className="md:col-span-2 text-sm text-red-300">{error}</p> : null}

        <div className="md:col-span-2">
          <UnderlitButton type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Company"}
          </UnderlitButton>
        </div>
      </form>
    </Panel>
  );
}

