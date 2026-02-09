import Dexie, { type Table } from "dexie";
import type { AppSettings, Lead, MetaRecord, Task, Touchpoint } from "@/types/models";

class CommandCenterDb extends Dexie {
  leads!: Table<Lead, string>;
  tasks!: Table<Task, string>;
  touchpoints!: Table<Touchpoint, string>;
  settings!: Table<AppSettings, string>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super("tu-command-center-db");

    this.version(1).stores({
      leads: "id, companyName, stage, priority, nextFollowUpAt, lastTouchAt, updatedAt, archivedAt",
      tasks: "id, leadId, dueAt, priority, status",
      touchpoints: "id, leadId, createdAt, type",
      settings: "id",
      meta: "key",
    });
  }
}

export const db = new CommandCenterDb();
