export const STAGES = [
  "Cold",
  "Researched",
  "Contacted",
  "Warm",
  "Qualified",
  "ProposalSent",
  "Negotiation",
  "ClosedWon",
  "ClosedLost",
  "NotAFit",
] as const;

export type Stage = (typeof STAGES)[number];

export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const BUDGETS = ["Unknown", "Low", "Mid", "High"] as const;
export type Budget = (typeof BUDGETS)[number];

export const OFFER_TIERS = ["Tier1", "Tier2", "Tier3"] as const;
export type OfferTier = (typeof OFFER_TIERS)[number];

export type TaskStatus = "Open" | "Done";
export type TouchpointType = "call" | "email" | "dm" | "note";

export interface LeadIntel {
  leadId: string;
  painPoints: string[];
  moneyLeaks: string[];
  quickWins: string[];
}

export interface Lead {
  id: string;
  companyName: string;
  stage: Stage;
  score: number;
  priority: Priority;
  budget: Budget;
  dealValue: number;
  website?: string;
  industry?: string;
  location?: string;
  contactName?: string;
  contactRole?: string;
  contactEmail?: string;
  contactPhone?: string;
  offerMatchTier?: OfferTier;
  recommendedMonthly?: number;
  recommendedSetupFee?: number;
  servicesInterested?: string;
  systemScope?: string;
  implementationStatus?: string;
  nextSteps?: string;
  notes?: string;
  lastTouchAt?: string;
  nextFollowUpAt?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  intel: LeadIntel;
}

export interface Task {
  id: string;
  leadId?: string;
  title: string;
  description?: string;
  dueAt: string;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
}

export interface Touchpoint {
  id: string;
  leadId: string;
  type: TouchpointType;
  content: string;
  createdAt: string;
}

export interface AppSettings {
  id: "app";
  staleThresholdDays: number;
  followUpRuleHours: number;
  defaultDealValue: number;
  updatedAt: string;
}

export interface MetaRecord {
  key: string;
  value: string;
  updatedAt: string;
}

export interface PipelineTotals {
  leadCount: number;
  totalDealValue: number;
}
