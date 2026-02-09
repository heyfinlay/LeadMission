"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { Input } from "@/components/ui/input";

interface EditableListProps {
  label: string;
  items: string[];
  onCommit: (next: string[]) => Promise<void>;
}

export const EditableList = ({ label, items, onCommit }: EditableListProps) => {
  const [draftNew, setDraftNew] = useState("");
  const [draftItems, setDraftItems] = useState<string[]>(items);

  useEffect(() => {
    setDraftItems(items);
  }, [items]);

  const updateDraft = (index: number, value: string): void => {
    const next = [...draftItems];
    next[index] = value;
    setDraftItems(next);
  };

  const commitItem = async (index: number): Promise<void> => {
    if (draftItems[index] === items[index]) {
      return;
    }

    await onCommit(draftItems);
  };

  const removeItem = async (index: number): Promise<void> => {
    const next = items.filter((_, itemIndex) => itemIndex !== index);
    await onCommit(next);
  };

  const addItem = async (): Promise<void> => {
    const value = draftNew.trim();
    if (!value) {
      return;
    }

    await onCommit([...items, value]);
    setDraftNew("");
  };

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">{label}</div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={`${label}-${index}`} className="flex items-center gap-2">
            <Input
              value={draftItems[index] || ""}
              onChange={(event) => updateDraft(index, event.target.value)}
              onBlur={() => void commitItem(index)}
              className="h-8"
            />
            <UnderlitButton size="icon" variant="ghost" onClick={() => void removeItem(index)}>
              <Trash2 className="h-4 w-4" />
            </UnderlitButton>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <Input
            value={draftNew}
            onChange={(event) => setDraftNew(event.target.value)}
            placeholder={`Add ${label.toLowerCase()}...`}
            className="h-8"
          />
          <UnderlitButton size="icon" onClick={() => void addItem()}>
            <Plus className="h-4 w-4" />
          </UnderlitButton>
        </div>
      </div>
    </div>
  );
};
