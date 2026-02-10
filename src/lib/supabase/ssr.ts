import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

const resolveSupabaseAuthConfig = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase auth env. Set NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
};

export const copySupabaseCookies = (source: NextResponse, target: NextResponse): NextResponse => {
  const setCookieHeaders = source.headers.getSetCookie?.() ?? [];
  if (setCookieHeaders.length > 0) {
    setCookieHeaders.forEach((cookie) => {
      target.headers.append("set-cookie", cookie);
    });
    return target;
  }

  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie);
  });

  return target;
};

export const createSupabaseRouteClient = (request: NextRequest, response: NextResponse) => {
  const { url, anonKey } = resolveSupabaseAuthConfig();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
};
