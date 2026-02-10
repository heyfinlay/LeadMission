import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
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

const readAdminEmail = (): string | null => {
  const value = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return value || null;
};

const countSetCookieHeaders = (response: NextResponse): number => {
  const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
  return setCookieHeaders.length;
};

const countSbCookiesFromStore = async (): Promise<number> => {
  const cookieStore = await cookies();
  return cookieStore.getAll().filter((cookie) => cookie.name.startsWith("sb-")).length;
};

const logCallbackOutcome = async (payload: {
  method: "code" | "otp" | "none";
  exchangeSucceeded: boolean;
  hasSessionCookie: boolean;
  hasUser: boolean;
  setCookieCount: number;
  requestHost: string;
  redirectHost: string;
}) => {
  const setCookieCount = payload.setCookieCount || (await countSbCookiesFromStore());

  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[auth-debug:callback] method=${payload.method} exchangeSucceeded=${String(payload.exchangeSucceeded)} hasSbCookie=${String(payload.hasSessionCookie)} hasUser=${String(payload.hasUser)} setCookieCount=${setCookieCount} requestHost=${payload.requestHost} redirectHost=${payload.redirectHost}`,
    );
  }

  logAuthDebug("callback", {
    route: "/auth/callback",
    hasSessionCookie: payload.hasSessionCookie,
    hasUser: payload.hasUser,
  });
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const requestHost = url.host;
  const successRedirect = new URL("/dashboard", request.url);
  const redirectHost = successRedirect.host;
  const adminEmail = readAdminEmail();

  const supabase = await createServerSupabaseClient();

  const finalize = async (method: "code" | "otp") => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const errorResponse = redirectWithOauthError(request);
      await logCallbackOutcome({
        method,
        exchangeSucceeded: true,
        hasSessionCookie: hasSessionCookie(request.cookies.getAll()),
        hasUser: false,
        setCookieCount: countSetCookieHeaders(errorResponse),
        requestHost,
        redirectHost: errorResponse.headers.get("location")
          ? new URL(errorResponse.headers.get("location")!, request.url).host
          : requestHost,
      });
      return errorResponse;
    }

    if (adminEmail && normalizeEmail(data.user.email) !== adminEmail) {
      const errorResponse = redirectWithOauthError(request);
      await logCallbackOutcome({
        method,
        exchangeSucceeded: true,
        hasSessionCookie: hasSessionCookie(request.cookies.getAll()),
        hasUser: false,
        setCookieCount: countSetCookieHeaders(errorResponse),
        requestHost,
        redirectHost: errorResponse.headers.get("location")
          ? new URL(errorResponse.headers.get("location")!, request.url).host
          : requestHost,
      });
      return errorResponse;
    }

    try {
      await ensureProfile(supabase, data.user);
    } catch {
      // Profile provisioning should not block login.
    }

    const response = NextResponse.redirect(successRedirect);
    await logCallbackOutcome({
      method,
      exchangeSucceeded: true,
      hasSessionCookie: hasSessionCookie(request.cookies.getAll()),
      hasUser: true,
      setCookieCount: countSetCookieHeaders(response),
      requestHost,
      redirectHost,
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
  await logCallbackOutcome({
    method: code ? "code" : tokenHash && type ? "otp" : "none",
    exchangeSucceeded: false,
    hasSessionCookie: hasSessionCookie(request.cookies.getAll()),
    hasUser: false,
    setCookieCount: countSetCookieHeaders(response),
    requestHost,
    redirectHost: response.headers.get("location")
      ? new URL(response.headers.get("location")!, request.url).host
      : requestHost,
  });
  return response;
}
