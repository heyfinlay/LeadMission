import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { hasSessionCookie, logAuthDebug } from "@/lib/supabase/debug";
import type { Database } from "@/types/supabase";

const normalizeEmail = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const redirectWithOauthError = (request: NextRequest) => {
  const errorUrl = new URL("/login", request.url);
  errorUrl.searchParams.set("error", "oauth");
  return NextResponse.redirect(errorUrl);
};

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

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

  const finalize = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return applyCookies(redirectWithOauthError(request));
    }

    const adminEmail = normalizeEmail(env.ADMIN_EMAIL);
    if (adminEmail && normalizeEmail(data.user.email) !== adminEmail) {
      await supabase.auth.signOut();
      return applyCookies(redirectWithOauthError(request));
    }

    logAuthDebug("callback", {
      route: "/auth/callback",
      hasSessionCookie: hasSessionCookie(request.cookies.getAll()),
      hasUser: true,
    });

    return applyCookies(NextResponse.redirect(new URL("/dashboard", request.url)));
  };

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return finalize();
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return finalize();
    }
  }

  return applyCookies(redirectWithOauthError(request));
}
