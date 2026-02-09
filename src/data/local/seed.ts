import { db } from "@/data/local/db";
import type { Budget, Lead, OfferTier, Priority, Stage, Task, TouchpointType } from "@/types/models";
import { generateId } from "@/lib/id";
import { nowIso } from "@/lib/date";
import { clampScore } from "@/lib/lead-utils";

const stageCycle: Stage[] = ["Warm", "Qualified", "Contacted", "Negotiation"];
const priorityCycle: Priority[] = ["Critical", "High", "Medium", "High"];
const budgetCycle: Budget[] = ["High", "Mid", "Unknown", "Mid"];

const buildLead = (index: number): Lead => {
  const id = generateId();
  const createdAt = new Date(Date.now() - (index + 2) * 86_400_000).toISOString();
  const nextFollowUpAt = new Date(Date.now() + (index - 1) * 86_400_000).toISOString();
  const offerMatchTier: OfferTier = index % 2 === 0 ? "Tier2" : "Tier3";

  return {
    id,
    companyName: ["Apex Interiors", "Kinetic Ops", "Northline Media", "Jetstream Health"][index],
    stage: stageCycle[index],
    score: clampScore(68 + index * 8),
    priority: priorityCycle[index],
    budget: budgetCycle[index],
    dealValue: 2200 + index * 1800,
    website: `https://example-${index + 1}.com`,
    industry: ["Construction", "Operations", "Marketing", "Healthcare"][index],
    location: ["Sydney", "Brisbane", "Melbourne", "Perth"][index],
    contactName: ["Jordan Lee", "Sam Wright", "Amelia Chen", "Noah Patel"][index],
    contactRole: ["Owner", "COO", "Director", "Practice Manager"][index],
    contactEmail: `contact${index + 1}@example.com`,
    contactPhone: `+61 400 000 10${index}`,
    offerMatchTier,
    recommendedMonthly: 1500 + index * 250,
    recommendedSetupFee: 900 + index * 200,
    servicesInterested: ["SEO + Paid Search", "CRM Automation", "Lead Nurture", "Analytics Cleanup"][index],
    systemScope: ["Landing pages, ad ops, and reporting", "Outbound + follow-up workflows", "Performance diagnostics", "Pipeline tracking + call prep"][index],
    implementationStatus: ["Discovery", "Scope Draft", "Pending Decision", "Pre-Launch"][index],
    nextSteps: ["Confirm package mix and timeline", "Approve implementation sprint", "Stakeholder signoff", "Book onboarding call"][index],
    notes: "Initial brief captured. Ready for tactical follow-up and decision support.",
    lastTouchAt: new Date(Date.now() - (index + 1) * 36_000_000).toISOString(),
    nextFollowUpAt,
    createdAt,
    updatedAt: nowIso(),
    intel: {
      leadId: id,
      painPoints: ["Lead response lag", "Unclear conversion funnel"],
      moneyLeaks: ["Ad spend waste", "No-shows without follow-up"],
      quickWins: ["Follow-up SOP", "Offer framing refresh"],
    },
  };
};

const buildTask = (leadId: string, title: string, offsetHours: number, priority: Priority, description: string): Task => {
  const dueAt = new Date(Date.now() + offsetHours * 3_600_000).toISOString();
  return {
    id: generateId(),
    leadId,
    title,
    description,
    dueAt,
    priority,
    status: "Open",
    createdAt: nowIso(),
  };
};

const buildTouchpoint = (leadId: string, type: TouchpointType, content: string, hoursAgo: number) => ({
  id: generateId(),
  leadId,
  type,
  content,
  createdAt: new Date(Date.now() - hoursAgo * 3_600_000).toISOString(),
});

export const seedDemoData = async (): Promise<void> => {
  const seeded = await db.meta.get("seeded");
  if (seeded?.value === "true") {
    return;
  }

  const leads = [0, 1, 2, 3].map(buildLead);
  const tasks: Task[] = [
    buildTask(leads[0].id, "Send proposal revision", -8, "Critical", "Address onboarding timeline concerns and ROI assumptions."),
    buildTask(leads[1].id, "Book decision call", 2, "High", "Lock a 30-minute decision session with final stakeholder."),
    buildTask(leads[2].id, "Follow up on quote", 20, "Medium", "Confirm quote acceptance window and budget owner."),
    buildTask(leads[3].id, "Prepare competitor teardown", 52, "High", "Summarize differentiators before the next discovery call."),
  ];
  const touchpoints = [
    buildTouchpoint(leads[0].id, "call", "Clarified proposal concerns around speed to value.", 12),
    buildTouchpoint(leads[1].id, "email", "Shared high-level roadmap and next-step options.", 30),
    buildTouchpoint(leads[2].id, "dm", "Asked for preferred follow-up time window.", 55),
  ];

  await db.transaction("rw", db.leads, db.tasks, db.touchpoints, db.meta, async () => {
    await db.leads.bulkPut(leads);
    await db.tasks.bulkPut(tasks);
    await db.touchpoints.bulkPut(touchpoints);
    await db.meta.put({ key: "seeded", value: "true", updatedAt: nowIso() });
  });
};
