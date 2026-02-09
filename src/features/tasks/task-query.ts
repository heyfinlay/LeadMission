import type { Lead, Task } from "@/types/models";
import { isDueToday, isOverdue } from "@/lib/tasks/urgency";

export type TaskView = "overdue" | "today" | "upcoming" | "all";

export interface TaskWithBusiness {
  task: Task;
  businessId?: string;
  businessName?: string;
}

export const sortOpenTasksByUrgency = (tasks: Task[]): Task[] =>
  [...tasks]
    .filter((task) => task.status === "Open")
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

export const filterTasksByView = (tasks: Task[], view: TaskView, now: Date = new Date()): Task[] => {
  const open = sortOpenTasksByUrgency(tasks);

  if (view === "all") {
    return open;
  }

  if (view === "overdue") {
    return open.filter((task) => isOverdue(task, now));
  }

  if (view === "today") {
    return open.filter((task) => isDueToday(task, now));
  }

  return open.filter((task) => !isOverdue(task, now) && !isDueToday(task, now));
};

export const attachBusinessContext = (tasks: Task[], leads: Lead[]): TaskWithBusiness[] => {
  const leadMap = new Map(leads.map((lead) => [lead.id, lead.companyName]));

  return tasks.map((task) => ({
    task,
    businessId: task.leadId,
    businessName: task.leadId ? leadMap.get(task.leadId) : undefined,
  }));
};
