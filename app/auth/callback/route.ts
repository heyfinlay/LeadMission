import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { ensureProfile } from "@/lib/profile/ensureProfile";
import { hasSessionCookie, logAuthDebug } from "@/lib/supabase/debug";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

const countSetCookieHeaders = (response: NextResponse): number => {
  const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
  if (setCookieHeaders.length > 0) {
    return setCookieHeaders.length;
  }

  return response.cookies.getAll().length;
};

const logCallbackOutcome = (payload: {
  method: "code" | "otp" | "none";
  exchangeSucceeded: boolean;
  hasSessionCookie: boolean;
  hasUser: boolean;
  setCookieCount: number;
}) => {
  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[auth-debug:callback] method=${payload.method} exchangeSucceeded=${String(payload.exchangeSucceeded)} hasSbCookie=${String(payload.hasSessionCookie)} hasUser=${String(payload.hasUser)} setCookieCount=${payload.setCookieCount}`,
    );
  }

  logAuthDebug("callback", {
    route: "/auth/callback",
    hasSessionCookie: payload.hasSessionCookie,
    hasUser: payload.hasUser,
  });
};

export async function GET(request: NextRequest) {
  const env = getServerEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createServerSupabaseClient();

  const finalize = async (method: "code" | "otp") => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const errorResponse = redirectWithOauthError(request);
      logCallbackOutcome({
        method,
        exchangeSucceeded: true,
        hasSessionCookie: hasSessionCookie(request.cookies.getAll()),
        hasUser: false,
        setCookieCount: countSetCookieHeaders(errorResponse),
      });
      return errorResponse;
    }

    const adminEmail = normalizeEmail(env.ADMIN_EMAIL);
    if (adminEmail && normalizeEmail(data.user.email) !== adminEmail) {
      const errorResponse = redirectWithOauthError(request);
      logCallbackOutcome({
        method,
        exchangeSucceeded: true,
        hasSessionCookie: hasSessionCookie(request.cookies.getAll()),
        hasUser: false,
        setCookieCount: countSetCookieHeaders(errorResponse),
      });
      return errorResponse;
    }

    try {
      await ensureProfile(supabase, data.user);
    } catch {
      // Profile provisioning should not block login.
    }

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    logCallbackOutcome({
      method,
      exchangeSucceeded: true,
      hasSessionCookie: hasSessionCookie(request.cookies.getAll()),
      hasUser: true,
      setCookieCount: countSetCookieHeaders(response),
    });

    return response;
  };

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return finalize("code");
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return finalize("otp");
    }
  }

  const response = redirectWithOauthError(request);
  logCallbackOutcome({
    method: code ? "code" : tokenHash && type ? "otp" : "none",
    exchangeSucceeded: false,
    hasSessionCookie: hasSessionCookie(request.cookies.getAll()),
    hasUser: false,
    setCookieCount: countSetCookieHeaders(response),
  });
  return response;
}
