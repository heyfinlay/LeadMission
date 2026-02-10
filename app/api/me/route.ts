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
  const cookiePresent = hasSessionCookie(request.cookies.getAll());

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[auth-debug:api-me] pathname=/api/me hasSbCookies=${String(cookiePresent)} hasUser=${String(Boolean(user))}`,
    );
  }

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

  return NextResponse.json(
    {
      authenticated: true,
      userId: user.id,
      provider,
    },
    { headers: cacheHeaders },
  );
}
