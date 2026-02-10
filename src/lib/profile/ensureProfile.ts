import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

interface IdentityData {
  avatar?: string | null;
  avatar_url?: string | null;
  global_name?: string | null;
  name?: string | null;
  preferred_username?: string | null;
  user_name?: string | null;
  username?: string | null;
  sub?: string | null;
}

const readIdentityData = (value: unknown): IdentityData => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as IdentityData;
};

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
};

const resolveUsername = (
  userMetadata: Record<string, unknown> | undefined,
  identityData: IdentityData,
): string | null => {
  return (
    readString(userMetadata?.user_name) ||
    readString(userMetadata?.preferred_username) ||
    readString(userMetadata?.username) ||
    readString(identityData.user_name) ||
    readString(identityData.preferred_username) ||
    readString(identityData.username) ||
    readString(identityData.global_name) ||
    readString(identityData.name) ||
    null
  );
};

const resolveAvatarUrl = (
  userMetadata: Record<string, unknown> | undefined,
  identityData: IdentityData,
): string | null => {
  return (
    readString(userMetadata?.avatar_url) ||
    readString(identityData.avatar_url) ||
    (identityData.avatar && identityData.sub
      ? `https://cdn.discordapp.com/avatars/${identityData.sub}/${identityData.avatar}.png`
      : null) ||
    null
  );
};

export const ensureProfile = async (supabase: Client, user: User) => {
  const firstIdentity = user.identities?.[0];
  const provider = readString(user.app_metadata?.provider) || readString(firstIdentity?.provider);
  const userMetadata = user.user_metadata as Record<string, unknown> | undefined;
  const identityData = readIdentityData(firstIdentity?.identity_data);

  const fullName =
    readString(userMetadata?.full_name) || readString(userMetadata?.name) || readString(identityData.global_name);
  const providerUsername = resolveUsername(userMetadata, identityData);
  const avatarUrl = resolveAvatarUrl(userMetadata, identityData);

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email: user.email ?? null,
      full_name: fullName,
      avatar_url: avatarUrl,
      provider: provider,
      provider_username: providerUsername,
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    throw error;
  }
};
