import { describe, expect, it } from "vitest";
import { isDueToday, isOverdue, timeRemaining } from "../src/lib/tasks/urgency";
import type { Task } from "../src/types/models";

const baseTask = (overrides: Partial<Task>): Task => ({
  id: "1",
  title: "Task",
  dueAt: new Date(2026, 1, 9, 8, 0, 0).toISOString(),
  priority: "High",
  status: "Open",
  createdAt: new Date(2026, 1, 8, 8, 0, 0).toISOString(),
  ...overrides,
});

describe("task urgency", () => {
  it("flags overdue only for open tasks in the past", () => {
    const now = new Date(2026, 1, 9, 10, 0, 0);
    expect(isOverdue(baseTask({}), now)).toBe(true);
    expect(isOverdue(baseTask({ status: "Done" }), now)).toBe(false);
    expect(isOverdue(baseTask({ dueAt: new Date(2026, 1, 9, 12, 0, 0).toISOString() }), now)).toBe(false);
  });

  it("flags due today by calendar day", () => {
    const now = new Date(2026, 1, 9, 10, 0, 0);
    expect(isDueToday(baseTask({ dueAt: new Date(2026, 1, 9, 22, 0, 0).toISOString() }), now)).toBe(true);
    expect(isDueToday(baseTask({ dueAt: new Date(2026, 1, 10, 1, 0, 0).toISOString() }), now)).toBe(false);
  });

  it("returns readable time remaining", () => {
    const now = new Date(2026, 1, 9, 10, 0, 0);
    expect(timeRemaining(baseTask({ dueAt: new Date(2026, 1, 9, 10, 30, 0).toISOString() }), now)).toContain("left");
    expect(timeRemaining(baseTask({ dueAt: new Date(2026, 1, 9, 9, 30, 0).toISOString() }), now)).toContain("overdue");
  });
});
