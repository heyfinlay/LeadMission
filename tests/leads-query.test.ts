import { describe, expect, it } from "vitest";
import { filterLeads, sortLeadsByPriority } from "../src/features/leads/lead-query";
import type { Lead } from "../src/types/models";

const mkLead = (overrides: Partial<Lead>): Lead => ({
  id: overrides.id || "lead-1",
  companyName: "Alpha",
  stage: "Warm",
  score: 70,
  priority: "Medium",
  budget: "Mid",
  dealValue: 3000,
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  intel: { leadId: overrides.id || "lead-1", painPoints: [], moneyLeaks: [], quickWins: [] },
  ...overrides,
});

describe("lead query", () => {
  it("filters by search and stage", () => {
    const leads = [
      mkLead({ id: "a", companyName: "Northline Media", stage: "Warm" }),
      mkLead({ id: "b", companyName: "Jetstream Health", stage: "Qualified" }),
    ];

    const result = filterLeads(leads, { search: "north", stage: "Warm" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("sorts lead priority by urgency blend", () => {
    const leads = [
      mkLead({ id: "a", priority: "Medium", score: 90 }),
      mkLead({ id: "b", priority: "Critical", score: 62 }),
    ];

    const sorted = sortLeadsByPriority(leads);
    expect(sorted[0].id).toBe("b");
  });
});
