import type { Json } from "@/types/supabase";

export interface ProposalSection {
  heading: string;
  body: string;
}

interface ProposalTemplateInput {
  businessName: string;
  industry?: string | null;
  auditSummary?: string | null;
}

export const buildProposalSections = (input: ProposalTemplateInput): ProposalSection[] => {
  return [
    {
      heading: "Executive Summary",
      body: `${input.businessName} is positioned for focused growth with a practical implementation plan.`,
    },
    {
      heading: "Current Situation",
      body: `Industry context: ${input.industry || "Not specified"}.\n\n${input.auditSummary || "No audit summary has been captured yet."}`,
    },
    {
      heading: "Scope of Work",
      body: "1) Funnel and website optimization\n2) Offer and messaging refinements\n3) Weekly implementation and reporting cadence",
    },
    {
      heading: "Timeline and Milestones",
      body: "Week 1: discovery + strategy alignment\nWeek 2-3: implementation sprint\nWeek 4: review, optimization, and next sprint planning",
    },
    {
      heading: "Commercials",
      body: "Proposal pricing scaffold. Fill in setup fee, monthly retainer, and any variable implementation costs.",
    },
  ];
};

export const sectionsToHtml = (sections: ProposalSection[]): string => {
  const escaped = sections.map((section) => ({
    heading: section.heading
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;"),
    body: section.body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>"),
  }));

  return escaped
    .map((section) => `<section><h2>${section.heading}</h2><p>${section.body}</p></section>`)
    .join("\n");
};

export const toJsonSections = (sections: ProposalSection[]): Json => sections as unknown as Json;

