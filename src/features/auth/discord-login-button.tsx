"use client";

import { useState } from "react";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

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

    const supabase = createSupabaseBrowserClient();
    const searchParams = new URLSearchParams(window.location.search);
    const next = sanitizeNext(searchParams.get("redirect") ?? searchParams.get("next"));
    const redirectUrl = new URL("/auth/callback", window.location.origin);
    redirectUrl.searchParams.set("next", next);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: redirectUrl.toString(),
      },
    });

    if (signInError) {
      setError(signInError.message);
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
