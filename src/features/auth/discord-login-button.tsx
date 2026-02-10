"use client";

import { useMemo, useState } from "react";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { getPublicEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface DiscordLoginButtonProps {
  next: string;
}

const sanitizeNext = (value: string): string => {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
};

export const DiscordLoginButton = ({ next }: DiscordLoginButtonProps) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = useMemo(() => {
    const env = getPublicEnv();
    const callback = new URL("/auth/callback", env.NEXT_PUBLIC_SITE_URL);
    callback.searchParams.set("next", sanitizeNext(next));
    return callback.toString();
  }, [next]);

  const onContinueWithDiscord = async () => {
    setIsPending(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo,
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
