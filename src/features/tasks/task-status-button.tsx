"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UnderlitButton } from "@/components/primitives/underlit-button";

interface TaskStatusButtonProps {
  taskId: string;
  nextStatus: string;
  label: string;
  variant?: "default" | "outline";
  size?: "default" | "sm";
}

export const TaskStatusButton = ({
  taskId,
  nextStatus,
  label,
  variant = "outline",
  size = "sm",
}: TaskStatusButtonProps) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <UnderlitButton
        variant={variant}
        size={size}
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const response = await fetch(`/api/tasks/${taskId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                status: nextStatus,
              }),
            });

            if (!response.ok) {
              const payload = (await response.json().catch(() => null)) as { error?: string } | null;
              throw new Error(payload?.error || "Failed to update task status.");
            }

            router.refresh();
          } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to update task status.");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Saving..." : label}
      </UnderlitButton>
      {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
    </div>
  );
};

