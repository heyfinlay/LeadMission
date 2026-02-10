import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/supabase";

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();
  const env = getServerEnv();

  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookies can't always be set from Server Components.
        }
      },
    },
  });
};

interface RouteCookieToSet {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
}

export const createRouteHandlerSupabaseClient = (request: NextRequest) => {
  const env = getServerEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const applyCookies = (target: NextResponse) => {
    const setCookieHeaders = response.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      setCookieHeaders.forEach((cookie) => {
        target.headers.append("set-cookie", cookie);
      });
      return target;
    }

    response.cookies.getAll().forEach((cookie: RouteCookieToSet) => {
      target.cookies.set(cookie.name, cookie.value, cookie.options);
    });

    return target;
  };

  return {
    supabase,
    applyCookies,
  };
};

export const createServiceRoleClient = () => {
  const env = getServerEnv();

  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
};
