"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type FieldType = "text" | "number" | "email" | "tel" | "url" | "datetime-local" | "textarea" | "select";

interface InlineEditFieldProps {
  label: string;
  value: string | number | undefined;
  onCommit: (value: string) => Promise<unknown> | unknown;
  placeholder?: string;
  type?: FieldType;
  options?: SelectOption[];
  className?: string;
}

export const InlineEditField = ({
  label,
  value,
  onCommit,
  placeholder,
  type = "text",
  options,
  className,
}: InlineEditFieldProps) => {
  const [draft, setDraft] = useState(value?.toString() || "");

  useEffect(() => {
    setDraft(value?.toString() || "");
  }, [value]);

  const commit = async (): Promise<void> => {
    if (draft === (value?.toString() || "")) {
      return;
    }

    await onCommit(draft);
  };

  return (
    <label className={className}>
      <span className="mb-1 block text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
      {type === "textarea" ? (
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commit()}
          placeholder={placeholder}
          rows={4}
        />
      ) : type === "select" && options ? (
        <Select
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            void onCommit(event.target.value);
          }}
          options={options}
        />
      ) : (
        <Input
          type={type}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => void commit()}
          placeholder={placeholder}
        />
      )}
    </label>
  );
};
