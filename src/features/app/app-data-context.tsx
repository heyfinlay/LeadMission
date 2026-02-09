"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  localLeadRepo,
  localSettingsRepo,
  localTaskRepo,
  localTouchpointRepo,
} from "@/data/local/local-repos";
import { runMigrations } from "@/data/local/migrations";
import { seedDemoData } from "@/data/local/seed";
import type { AppSettings, Lead, Task, Touchpoint } from "@/types/models";

interface ExportBundle {
  exportedAt: string;
  leads: Lead[];
  tasks: Task[];
  touchpoints: Touchpoint[];
}

interface AppDataContextValue {
  ready: boolean;
  leads: Lead[];
  tasks: Task[];
  touchpoints: Touchpoint[];
  settings: AppSettings | null;
  refresh: () => Promise<void>;
  createLead: (input: Omit<Lead, "id" | "createdAt" | "updatedAt"> & { id?: string }) => Promise<Lead>;
  updateLead: (id: string, patch: Partial<Omit<Lead, "id" | "createdAt">>) => Promise<Lead | undefined>;
  createTask: (input: Omit<Task, "id" | "createdAt" | "status"> & { id?: string; status?: Task["status"] }) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) => Promise<Task | undefined>;
  createTouchpoint: (
    input: Omit<Touchpoint, "id" | "createdAt"> & { id?: string; createdAt?: string },
  ) => Promise<Touchpoint>;
  updateSettings: (patch: Partial<Omit<AppSettings, "id">>) => Promise<AppSettings>;
  exportBundle: () => ExportBundle;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export const AppDataProvider = ({ children }: PropsWithChildren) => {
  const [ready, setReady] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    const [nextLeads, nextTasks, nextTouchpoints, nextSettings] = await Promise.all([
      localLeadRepo.list(false),
      localTaskRepo.list(),
      localTouchpointRepo.list(),
      localSettingsRepo.get(),
    ]);

    setLeads(nextLeads);
    setTasks(nextTasks);
    setTouchpoints(nextTouchpoints);
    setSettings(nextSettings);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initialize = async (): Promise<void> => {
      await runMigrations();
      await seedDemoData();
      await refresh();
      if (mounted) {
        setReady(true);
      }
    };

    void initialize();

    return () => {
      mounted = false;
    };
  }, [refresh]);

  const createLead: AppDataContextValue["createLead"] = useCallback(async (input) => {
    const created = await localLeadRepo.create(input);
    await refresh();
    return created;
  }, [refresh]);

  const updateLead: AppDataContextValue["updateLead"] = useCallback(async (id, patch) => {
    const updated = await localLeadRepo.update(id, patch);
    await refresh();
    return updated;
  }, [refresh]);

  const createTask: AppDataContextValue["createTask"] = useCallback(async (input) => {
    const created = await localTaskRepo.create(input);
    await refresh();
    return created;
  }, [refresh]);

  const updateTask: AppDataContextValue["updateTask"] = useCallback(async (id, patch) => {
    const updated = await localTaskRepo.update(id, patch);
    await refresh();
    return updated;
  }, [refresh]);

  const createTouchpoint: AppDataContextValue["createTouchpoint"] = useCallback(async (input) => {
    const created = await localTouchpointRepo.create(input);
    await refresh();
    return created;
  }, [refresh]);

  const updateSettings: AppDataContextValue["updateSettings"] = useCallback(async (patch) => {
    const updated = await localSettingsRepo.update(patch);
    await refresh();
    return updated;
  }, [refresh]);

  const exportBundle = useCallback<AppDataContextValue["exportBundle"]>(() => ({
    exportedAt: new Date().toISOString(),
    leads,
    tasks,
    touchpoints,
  }), [leads, tasks, touchpoints]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ready,
      leads,
      tasks,
      touchpoints,
      settings,
      refresh,
      createLead,
      updateLead,
      createTask,
      updateTask,
      createTouchpoint,
      updateSettings,
      exportBundle,
    }),
    [
      ready,
      leads,
      tasks,
      touchpoints,
      settings,
      refresh,
      createLead,
      updateLead,
      createTask,
      updateTask,
      createTouchpoint,
      updateSettings,
      exportBundle,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
};

export const useAppData = (): AppDataContextValue => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }

  return context;
};
