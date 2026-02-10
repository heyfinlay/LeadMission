import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSessionCookie, logAuthDebug } from "@/lib/supabase/debug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface DiscordIdentityData {
  avatar?: string | null;
  avatar_url?: string | null;
  global_name?: string | null;
  name?: string | null;
  preferred_username?: string | null;
  user_name?: string | null;
  username?: string | null;
  sub?: string | null;
}

const readDiscordIdentityData = (value: unknown): DiscordIdentityData => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as DiscordIdentityData;
};

const toDiscordAvatarUrl = (identity: DiscordIdentityData): string | null => {
  if (typeof identity.avatar_url === "string" && identity.avatar_url) {
    return identity.avatar_url;
  }

  if (typeof identity.avatar === "string" && identity.avatar && typeof identity.sub === "string" && identity.sub) {
    return `https://cdn.discordapp.com/avatars/${identity.sub}/${identity.avatar}.png`;
  }

  return null;
};

const pickDiscordUsername = (
  userMetadata: Record<string, unknown> | undefined,
  identityData: DiscordIdentityData,
): string | null => {
  const fromMetadata = [
    userMetadata?.user_name,
    userMetadata?.preferred_username,
    userMetadata?.username,
    userMetadata?.name,
    userMetadata?.full_name,
  ].find((value) => typeof value === "string" && value.trim().length > 0);

  if (typeof fromMetadata === "string") {
    return fromMetadata;
  }

  const fromIdentity = [
    identityData.user_name,
    identityData.preferred_username,
    identityData.username,
    identityData.global_name,
    identityData.name,
  ].find((value) => typeof value === "string" && value.trim().length > 0);

  return fromIdentity ?? null;
};

const cacheHeaders = {
  "Cache-Control": "no-store",
};

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user ?? null;
  const cookiePresent = hasSessionCookie(request.cookies.getAll());

  logAuthDebug("api:me", {
    route: "/api/me",
    hasSessionCookie: cookiePresent,
    hasUser: Boolean(user),
  });

  if (!user) {
    return NextResponse.json(
      {
        authenticated: false,
      },
      { headers: cacheHeaders },
    );
  }

  const firstIdentity = user.identities?.[0];
  const provider = user.app_metadata?.provider || firstIdentity?.provider || null;
  const identityData = readDiscordIdentityData(firstIdentity?.identity_data);
  const discordUsername = pickDiscordUsername(
    user.user_metadata as Record<string, unknown> | undefined,
    identityData,
  );
  const avatarUrl = toDiscordAvatarUrl(identityData);

  return NextResponse.json(
    {
      authenticated: true,
      userId: user.id,
      email: user.email ?? null,
      provider,
      discordUsername,
      avatarUrl,
    },
    { headers: cacheHeaders },
  );
}
