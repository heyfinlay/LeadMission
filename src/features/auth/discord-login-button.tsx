"use client";

import { useState } from "react";
import { UnderlitButton } from "@/components/primitives/underlit-button";

const sanitizeNext = (value: string | null): string => {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
};

export const DiscordLoginButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onContinueWithDiscord = async () => {
    setIsPending(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams(window.location.search);
      const next = sanitizeNext(searchParams.get("redirect") ?? searchParams.get("next"));
      const loginUrl = new URL("/auth/login", window.location.origin);
      loginUrl.searchParams.set("provider", "discord");
      loginUrl.searchParams.set("next", next);
      window.location.assign(loginUrl.toString());
    } catch {
      setError("Unable to start Discord login. Please try again.");
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-3">
      <UnderlitButton type="button" onClick={onContinueWithDiscord} disabled={isPending}>
        {isPending ? "Redirecting..." : "Continue with Discord"}
      </UnderlitButton>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </div>
  );
};
