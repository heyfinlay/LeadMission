import type {
  LeadRepo,
  SettingsRepo,
  TaskRepo,
  TouchpointRepo,
} from "@/data/repos/contracts";
import { db } from "@/data/local/db";
import { DEFAULT_SETTINGS } from "@/data/local/settings";
import { nowIso } from "@/lib/date";
import { generateId } from "@/lib/id";
import { clampScore } from "@/lib/lead-utils";
import type { AppSettings, Lead, Task, Touchpoint } from "@/types/models";

export class LocalLeadRepo implements LeadRepo {
  async list(includeArchived = false): Promise<Lead[]> {
    const leads = await db.leads.orderBy("updatedAt").reverse().toArray();
    return includeArchived ? leads : leads.filter((lead) => !lead.archivedAt);
  }

  async getById(id: string): Promise<Lead | undefined> {
    return db.leads.get(id);
  }

  async create(
    input: Omit<Lead, "id" | "createdAt" | "updatedAt"> & { id?: string },
  ): Promise<Lead> {
    const now = nowIso();
    const id = input.id || generateId();
    const lead: Lead = {
      ...input,
      id,
      score: clampScore(input.score),
      createdAt: now,
      updatedAt: now,
      intel: {
        ...input.intel,
        leadId: id,
      },
    };

    await db.leads.put(lead);
    return lead;
  }

  async update(id: string, patch: Partial<Omit<Lead, "id" | "createdAt">>): Promise<Lead | undefined> {
    const existing = await db.leads.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Lead = {
      ...existing,
      ...patch,
      score: patch.score !== undefined ? clampScore(patch.score) : existing.score,
      intel: {
        ...existing.intel,
        ...(patch.intel || {}),
        leadId: existing.id,
      },
      updatedAt: nowIso(),
    };

    await db.leads.put(updated);
    return updated;
  }

  async archive(id: string): Promise<void> {
    await this.update(id, { archivedAt: nowIso() });
  }

  async restore(id: string): Promise<void> {
    await this.update(id, { archivedAt: undefined });
  }
}

export class LocalTaskRepo implements TaskRepo {
  async list(): Promise<Task[]> {
    return db.tasks.orderBy("dueAt").toArray();
  }

  async listByLead(leadId: string): Promise<Task[]> {
    return db.tasks.where("leadId").equals(leadId).sortBy("dueAt");
  }

  async create(
    input: Omit<Task, "id" | "createdAt" | "status"> & { id?: string; status?: Task["status"] },
  ): Promise<Task> {
    const task: Task = {
      ...input,
      id: input.id || generateId(),
      createdAt: nowIso(),
      status: input.status || "Open",
    };

    await db.tasks.put(task);
    return task;
  }

  async update(id: string, patch: Partial<Omit<Task, "id" | "createdAt">>): Promise<Task | undefined> {
    const existing = await db.tasks.get(id);
    if (!existing) {
      return undefined;
    }

    const nextStatus = patch.status || existing.status;
    const completedAt =
      nextStatus === "Done"
        ? patch.completedAt || existing.completedAt || nowIso()
        : patch.status === "Open"
          ? undefined
          : existing.completedAt;

    const updated: Task = {
      ...existing,
      ...patch,
      completedAt,
      status: nextStatus,
    };

    await db.tasks.put(updated);
    return updated;
  }
}

export class LocalTouchpointRepo implements TouchpointRepo {
  async listByLead(leadId: string): Promise<Touchpoint[]> {
    const list = await db.touchpoints.where("leadId").equals(leadId).sortBy("createdAt");
    return list.reverse();
  }

  async list(): Promise<Touchpoint[]> {
    return db.touchpoints.orderBy("createdAt").reverse().toArray();
  }

  async create(input: Omit<Touchpoint, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<Touchpoint> {
    const touchpoint: Touchpoint = {
      ...input,
      id: input.id || generateId(),
      createdAt: input.createdAt || nowIso(),
    };

    await db.touchpoints.put(touchpoint);

    const lead = await db.leads.get(touchpoint.leadId);
    if (lead) {
      await db.leads.put({
        ...lead,
        lastTouchAt: touchpoint.createdAt,
        updatedAt: nowIso(),
      });
    }

    return touchpoint;
  }
}

export class LocalSettingsRepo implements SettingsRepo {
  async get(): Promise<AppSettings> {
    const existing = await db.settings.get("app");
    if (existing) {
      return existing;
    }

    const defaults = DEFAULT_SETTINGS();
    await db.settings.put(defaults);
    return defaults;
  }

  async update(patch: Partial<Omit<AppSettings, "id">>): Promise<AppSettings> {
    const existing = await this.get();
    const updated: AppSettings = {
      ...existing,
      ...patch,
      id: "app",
      updatedAt: nowIso(),
    };

    await db.settings.put(updated);
    return updated;
  }
}

export const localLeadRepo = new LocalLeadRepo();
export const localTaskRepo = new LocalTaskRepo();
export const localTouchpointRepo = new LocalTouchpointRepo();
export const localSettingsRepo = new LocalSettingsRepo();
