import { NextResponse, type NextRequest } from "next/server";
import { ensureProfile } from "@/lib/profile/ensureProfile";
import { hasSessionCookie, logAuthDebug } from "@/lib/supabase/debug";
import { createSupabaseRouteClient } from "@/lib/supabase/ssr";

const normalizeEmail = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const createOauthErrorResponse = (request: NextRequest) => {
  const errorUrl = new URL("/login", request.url);
  errorUrl.searchParams.set("error", "oauth");
  return NextResponse.redirect(errorUrl);
};

const countSetCookies = (response: NextResponse): number => {
  const setCookieHeaders = response.headers.getSetCookie?.();
  if (setCookieHeaders && setCookieHeaders.length > 0) {
    return setCookieHeaders.length;
  }

  return response.headers.get("set-cookie") ? 1 : 0;
};

const logCallbackDebug = (payload: {
  method: "code" | "none";
  host: string;
  hasCode: boolean;
  exchangeSucceeded: boolean;
  hasSbCookie: boolean;
  hasUser: boolean;
  redirectHost: string;
  response: NextResponse;
}) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("[auth-debug:callback]", {
      method: payload.method,
      host: payload.host,
      hasCode: payload.hasCode,
      exchangeSucceeded: payload.exchangeSucceeded,
      hasSbCookie: payload.hasSbCookie,
      hasUser: payload.hasUser,
      redirectHost: payload.redirectHost,
      setCookieCount: countSetCookies(payload.response),
      hasSetCookieHeader: payload.response.headers.get("set-cookie") != null,
    });
  }

  logAuthDebug("callback", {
    route: "/auth/callback",
    hasSessionCookie: payload.hasSbCookie,
    hasUser: payload.hasUser,
  });
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = new URL("/dashboard", request.url);
  const response = NextResponse.redirect(redirectTo);

  if (!code) {
    const errorResponse = createOauthErrorResponse(request);
    logCallbackDebug({
      method: "none",
      host: url.host,
      hasCode: false,
      exchangeSucceeded: false,
      hasSbCookie: hasSessionCookie(request.cookies.getAll()),
      hasUser: false,
      redirectHost: new URL(errorResponse.headers.get("location") ?? request.url, request.url).host,
      response: errorResponse,
    });
    return errorResponse;
  }

  const supabase = createSupabaseRouteClient(request, response);
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  const exchangeOk = !exchangeError;

  if (!exchangeOk) {
    const errorResponse = createOauthErrorResponse(request);
    logCallbackDebug({
      method: "code",
      host: url.host,
      hasCode: true,
      exchangeSucceeded: false,
      hasSbCookie: hasSessionCookie(request.cookies.getAll()),
      hasUser: false,
      redirectHost: new URL(errorResponse.headers.get("location") ?? request.url, request.url).host,
      response: errorResponse,
    });
    return errorResponse;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const errorResponse = createOauthErrorResponse(request);
    logCallbackDebug({
      method: "code",
      host: url.host,
      hasCode: true,
      exchangeSucceeded: true,
      hasSbCookie: hasSessionCookie(request.cookies.getAll()),
      hasUser: false,
      redirectHost: new URL(errorResponse.headers.get("location") ?? request.url, request.url).host,
      response: errorResponse,
    });
    return errorResponse;
  }

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL ?? null);
  if (adminEmail && normalizeEmail(user.email) !== adminEmail) {
    const deniedResponse = createOauthErrorResponse(request);
    const deniedClient = createSupabaseRouteClient(request, deniedResponse);
    await deniedClient.auth.signOut();
    logCallbackDebug({
      method: "code",
      host: url.host,
      hasCode: true,
      exchangeSucceeded: true,
      hasSbCookie: hasSessionCookie(request.cookies.getAll()),
      hasUser: false,
      redirectHost: new URL(deniedResponse.headers.get("location") ?? request.url, request.url).host,
      response: deniedResponse,
    });
    return deniedResponse;
  }

  try {
    await ensureProfile(supabase, user);
  } catch {
    // Profile provisioning is best-effort and should not block auth completion.
  }

  logCallbackDebug({
    method: "code",
    host: url.host,
    hasCode: true,
    exchangeSucceeded: true,
    hasSbCookie: hasSessionCookie(request.cookies.getAll()),
    hasUser: true,
    redirectHost: redirectTo.host,
    response,
  });

  return response;
}
