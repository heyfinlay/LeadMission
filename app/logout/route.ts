import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/supabase";

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const pendingCookies = new Map<string, { name: string; value: string; options?: Parameters<NextResponse["cookies"]["set"]>[2] }>();
  const applyCookies = (response: NextResponse) => {
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  };

  const supabase = createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          pendingCookies.set(name, { name, value, options });
        });
      },
    },
  });

  await supabase.auth.signOut();

  const redirectUrl = new URL("/login", request.url);
  return applyCookies(NextResponse.redirect(redirectUrl));
}
