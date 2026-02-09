import type { AppSettings } from "@/types/models";
import { nowIso } from "@/lib/date";

export const DEFAULT_SETTINGS = (): AppSettings => ({
  id: "app",
  staleThresholdDays: 14,
  followUpRuleHours: 72,
  defaultDealValue: 3500,
  updatedAt: nowIso(),
});
