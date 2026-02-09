import type { Task } from "@/types/models";

const isOpen = (task: Task): boolean => task.status === "Open";

export const isOverdue = (task: Task, now: Date = new Date()): boolean => {
  if (!isOpen(task)) {
    return false;
  }

  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  return due.getTime() < now.getTime();
};

export const isDueToday = (task: Task, now: Date = new Date()): boolean => {
  if (!isOpen(task)) {
    return false;
  }

  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) {
    return false;
  }

  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
};

export const timeRemaining = (task: Task, now: Date = new Date()): string => {
  const due = new Date(task.dueAt);
  if (Number.isNaN(due.getTime())) {
    return "No due date";
  }

  const deltaMs = due.getTime() - now.getTime();
  const absMs = Math.abs(deltaMs);
  const minutes = Math.floor(absMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const unit = days > 0 ? `${days}d` : hours > 0 ? `${hours}h` : `${minutes}m`;

  if (deltaMs < 0) {
    return `${unit} overdue`;
  }

  return `${unit} left`;
};
