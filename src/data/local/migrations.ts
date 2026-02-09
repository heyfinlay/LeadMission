import { db } from "@/data/local/db";
import { nowIso } from "@/lib/date";
import { DEFAULT_SETTINGS } from "@/data/local/settings";

export const CURRENT_SCHEMA_VERSION = 1;

const applyV1 = async (): Promise<void> => {
  const existing = await db.settings.get("app");
  if (!existing) {
    await db.settings.put(DEFAULT_SETTINGS());
  }
};

const migrationMap: Record<number, () => Promise<void>> = {
  1: applyV1,
};

export const runMigrations = async (): Promise<void> => {
  const schemaRecord = await db.meta.get("schemaVersion");
  const currentVersion = Number(schemaRecord?.value || 0);

  for (let nextVersion = currentVersion + 1; nextVersion <= CURRENT_SCHEMA_VERSION; nextVersion += 1) {
    const migration = migrationMap[nextVersion];
    if (migration) {
      await migration();
    }

    await db.meta.put({
      key: "schemaVersion",
      value: String(nextVersion),
      updatedAt: nowIso(),
    });
  }
};
