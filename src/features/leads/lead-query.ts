import type { Lead, Stage } from "@/types/models";

export interface LeadQuery {
  search: string;
  stage: Stage | "All";
}

export const filterLeads = (leads: Lead[], query: LeadQuery): Lead[] => {
  const searchValue = query.search.trim().toLowerCase();

  return leads.filter((lead) => {
    if (query.stage !== "All" && lead.stage !== query.stage) {
      return false;
    }

    if (!searchValue) {
      return true;
    }

    const haystack = [
      lead.companyName,
      lead.contactName,
      lead.website,
      lead.industry,
      lead.location,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchValue);
  });
};

const scoreLeadUrgency = (lead: Lead): number => {
  const priorityWeight =
    lead.priority === "Critical" ? 60 : lead.priority === "High" ? 28 : lead.priority === "Medium" ? 12 : 0;

  const followUpPenalty = lead.nextFollowUpAt ? Math.max(0, 14 - Math.floor((new Date(lead.nextFollowUpAt).getTime() - Date.now()) / 86_400_000)) : 0;

  return lead.score + priorityWeight + followUpPenalty;
};

export const sortLeadsByPriority = (leads: Lead[]): Lead[] =>
  [...leads].sort((a, b) => scoreLeadUrgency(b) - scoreLeadUrgency(a));
