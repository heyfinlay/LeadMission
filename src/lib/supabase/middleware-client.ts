import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

interface CookieToSet {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
}

export interface MiddlewareSupabaseContext {
  supabase: SupabaseClient<Database>;
  createResponse: () => NextResponse;
  applyCookies: (target: NextResponse) => NextResponse;
}

export const createMiddlewareSupabaseClient = (
  request: NextRequest,
): MiddlewareSupabaseContext | null => {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const pendingCookies = new Map<string, CookieToSet>();
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
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

  const createResponse = () => NextResponse.next({ request });

  const applyCookies = (target: NextResponse) => {
    pendingCookies.forEach(({ name, value, options }) => {
      target.cookies.set(name, value, options);
    });
    return target;
  };

  return {
    supabase,
    createResponse,
    applyCookies,
  };
};
