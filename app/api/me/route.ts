import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie, logAuthDebug } from "@/lib/supabase/debug";
import { copySupabaseCookies, createSupabaseRouteClient } from "@/lib/supabase/ssr";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const cacheHeaders = {
  "Cache-Control": "no-store",
};

export async function GET(request: NextRequest) {
  const sessionResponse = NextResponse.next({ request });
  const supabase = createSupabaseRouteClient(request, sessionResponse);
  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user ?? null;
  const cookiePresent = hasSessionCookie(request.cookies.getAll());

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[auth-debug:api-me] pathname=/api/me hasSbCookie=${String(cookiePresent)} hasUser=${String(Boolean(user))}`,
    );
  }

  logAuthDebug("api:me", {
    route: "/api/me",
    hasSessionCookie: cookiePresent,
    hasUser: Boolean(user),
  });

  if (!user) {
    const response = NextResponse.json(
      {
        authenticated: false,
        user: null,
        provider: null,
      },
      { headers: cacheHeaders },
    );
    return copySupabaseCookies(sessionResponse, response);
  }

  const firstIdentity = user.identities?.[0];
  const provider = user.app_metadata?.provider || firstIdentity?.provider || null;

  const response = NextResponse.json(
    {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email ?? null,
      },
      provider,
    },
    { headers: cacheHeaders },
  );
  return copySupabaseCookies(sessionResponse, response);
}
