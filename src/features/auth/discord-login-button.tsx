"use client";

import { useState } from "react";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const resolveSiteUrl = (): string => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
  return siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
};

export const DiscordLoginButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onContinueWithDiscord = async () => {
    setIsPending(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${resolveSiteUrl()}/auth/callback`,
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
