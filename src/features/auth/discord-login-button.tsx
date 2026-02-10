"use client";

import { useState } from "react";
import { UnderlitButton } from "@/components/primitives/underlit-button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const trimTrailingSlash = (value: string): string => {
  return value.endsWith("/") ? value.slice(0, -1) : value;
};

const resolveOauthOrigin = (): string => {
  const currentOrigin = trimTrailingSlash(window.location.origin);
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredSiteUrl) {
    return currentOrigin;
  }

  let configuredOrigin = configuredSiteUrl;
  try {
    configuredOrigin = trimTrailingSlash(new URL(configuredSiteUrl).origin);
  } catch {
    configuredOrigin = trimTrailingSlash(configuredSiteUrl);
  }

  if (process.env.NODE_ENV !== "production" && configuredOrigin !== currentOrigin) {
    console.warn(
      `[auth-debug:oauth-origin] NEXT_PUBLIC_SITE_URL (${configuredOrigin}) does not match window.location.origin (${currentOrigin}); using current origin for redirectTo.`,
    );
    return currentOrigin;
  }

  return configuredOrigin;
};

export const DiscordLoginButton = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onContinueWithDiscord = async () => {
    setIsPending(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${resolveOauthOrigin()}/auth/callback`;
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
