"use client";

import { Download } from "lucide-react";
import { LoadingState } from "@/components/primitives/loading-state";
import { Panel } from "@/components/primitives/panel";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/features/app/app-data-context";

const downloadJson = (filename: string, payload: unknown): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function SettingsPage() {
  const { ready, settings, leads, tasks, touchpoints, updateSettings, exportBundle } = useAppData();

  if (!ready || !settings) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-4">
      <Panel title="App Defaults" subtitle="Operator-level behavior tuning.">
        <div className="grid max-w-3xl gap-4 md:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Stale threshold days</span>
            <Input
              type="number"
              min={1}
              value={settings.staleThresholdDays}
              onChange={(event) => void updateSettings({ staleThresholdDays: Number(event.target.value) || 1 })}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Follow-up rule hours</span>
            <Input
              type="number"
              min={1}
              value={settings.followUpRuleHours}
              onChange={(event) => void updateSettings({ followUpRuleHours: Number(event.target.value) || 1 })}
            />
          </label>

          <label>
            <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">Default deal value (AUD)</span>
            <Input
              type="number"
              min={0}
              value={settings.defaultDealValue}
              onChange={(event) => void updateSettings({ defaultDealValue: Number(event.target.value) || 0 })}
            />
          </label>
        </div>
      </Panel>

      <Panel title="Data Export" subtitle="JSON export placeholders for local-first operation.">
        <div className="flex flex-wrap gap-2">
          <UnderlitButton variant="outline" onClick={() => downloadJson("tu-leads.json", leads)}>
            <Download className="h-4 w-4" />
            Export Leads
          </UnderlitButton>
          <UnderlitButton variant="outline" onClick={() => downloadJson("tu-tasks.json", tasks)}>
            <Download className="h-4 w-4" />
            Export Tasks
          </UnderlitButton>
          <UnderlitButton variant="outline" onClick={() => downloadJson("tu-touchpoints.json", touchpoints)}>
            <Download className="h-4 w-4" />
            Export Touchpoints
          </UnderlitButton>
          <UnderlitButton onClick={() => downloadJson("tu-full-export.json", exportBundle())}>
            <Download className="h-4 w-4" />
            Export Full Snapshot
          </UnderlitButton>
        </div>
      </Panel>
    </div>
  );
}
