import type { AppSettings, Lead, Task, Touchpoint } from "@/types/models";

export interface LeadRepo {
  list(includeArchived?: boolean): Promise<Lead[]>;
  getById(id: string): Promise<Lead | undefined>;
  create(input: Omit<Lead, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<Lead>;
  update(id: string, patch: Partial<Omit<Lead, "id" | "createdAt">>): Promise<Lead | undefined>;
  archive(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}

export interface TaskRepo {
  list(): Promise<Task[]>;
  listByLead(leadId: string): Promise<Task[]>;
  create(input: Omit<Task, "id" | "createdAt" | "status"> & { id?: string; status?: Task["status"] }): Promise<Task>;
  update(id: string, patch: Partial<Omit<Task, "id" | "createdAt">>): Promise<Task | undefined>;
}

export interface TouchpointRepo {
  listByLead(leadId: string): Promise<Touchpoint[]>;
  list(): Promise<Touchpoint[]>;
  create(input: Omit<Touchpoint, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<Touchpoint>;
}

export interface SettingsRepo {
  get(): Promise<AppSettings>;
  update(patch: Partial<Omit<AppSettings, "id">>): Promise<AppSettings>;
}
