import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hasSessionCookie, logAuthDebug } from "@/lib/supabase/debug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const cacheHeaders = {
  "Cache-Control": "no-store",
};

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user ?? null;
  const authenticated = Boolean(user);
  const cookiePresent = hasSessionCookie(request.cookies.getAll());

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[auth-debug:api-me] pathname=/api/me hasSbCookie=${String(cookiePresent)} authenticated=${String(authenticated)}`,
    );
  }

  logAuthDebug("api:me", {
    route: "/api/me",
    hasSessionCookie: cookiePresent,
    hasUser: authenticated,
  });

  if (!user) {
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        provider: null,
      },
      { headers: cacheHeaders },
    );
  }

  const firstIdentity = user.identities?.[0];
  const provider = user.app_metadata?.provider || firstIdentity?.provider || null;
  const identityData =
    firstIdentity && typeof firstIdentity.identity_data === "object" && firstIdentity.identity_data
      ? (firstIdentity.identity_data as Record<string, unknown>)
      : null;
  const metadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : null;
  const providerUsername =
    (typeof metadata?.preferred_username === "string" ? metadata.preferred_username : null) ??
    (typeof identityData?.preferred_username === "string" ? identityData.preferred_username : null) ??
    (typeof identityData?.user_name === "string" ? identityData.user_name : null) ??
    (typeof identityData?.username === "string" ? identityData.username : null);
  const discordUsername =
    (typeof metadata?.full_name === "string" ? metadata.full_name : null) ??
    (typeof identityData?.global_name === "string" ? identityData.global_name : null) ??
    (typeof identityData?.name === "string" ? identityData.name : null);
  const fullName =
    (typeof metadata?.name === "string" ? metadata.name : null) ??
    (typeof metadata?.full_name === "string" ? metadata.full_name : null) ??
    discordUsername;
  const avatarUrl =
    (typeof metadata?.avatar_url === "string" ? metadata.avatar_url : null) ??
    (typeof identityData?.avatar_url === "string" ? identityData.avatar_url : null) ??
    null;

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      provider,
      providerUsername,
      discordUsername,
      fullName,
      avatarUrl,
    },
    { headers: cacheHeaders },
  );
}
