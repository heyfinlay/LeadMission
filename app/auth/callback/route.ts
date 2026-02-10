import { NextResponse, type NextRequest } from "next/server";
import { ensureProfile } from "@/lib/profile/ensureProfile";
import { createSupabaseRouteClient } from "@/lib/supabase/ssr";

const sanitizeNext = (value: string | null): string => {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
};

const normalizeEmail = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const getSetCookieCount = (response: NextResponse): number => {
  const getSetCookie = response.headers.getSetCookie?.();
  if (getSetCookie && getSetCookie.length > 0) {
    return getSetCookie.length;
  }

  return response.headers.get("set-cookie") ? 1 : 0;
};

const buildSuccessRedirect = (request: NextRequest, next: string): URL => {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const inDev = process.env.NODE_ENV === "development";

  if (!inDev && forwardedHost) {
    return new URL(`https://${forwardedHost}${next}`);
  }

  return new URL(`${origin}${next}`);
};

const oauthErrorRedirect = (request: NextRequest): NextResponse => {
  const { origin, searchParams } = new URL(request.url);
  const reason =
    searchParams.get("error_description") ??
    searchParams.get("error") ??
    searchParams.get("error_code") ??
    "OAuth callback failed.";
  const redirectUrl = new URL(`${origin}/login`);
  redirectUrl.searchParams.set("error", reason);
  return NextResponse.redirect(redirectUrl);
};

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));
  const successRedirect = buildSuccessRedirect(request, next);
  const response = NextResponse.redirect(successRedirect);

  if (!code) {
    const errorResponse = oauthErrorRedirect(request);
    if (process.env.NODE_ENV !== "production") {
      console.log("[auth-debug:callback]", {
        host: requestUrl.host,
        hasCode: false,
        exchangeSucceeded: false,
        setCookieCount: getSetCookieCount(errorResponse),
      });
    }
    return errorResponse;
  }

  const supabase = createSupabaseRouteClient(request, response);
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  const exchangeSucceeded = !exchangeError;

  if (!exchangeSucceeded) {
    const errorResponse = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url),
    );
    if (process.env.NODE_ENV !== "production") {
      console.log("[auth-debug:callback]", {
        host: requestUrl.host,
        hasCode: true,
        exchangeSucceeded: false,
        exchangeError: exchangeError.message,
        setCookieCount: getSetCookieCount(errorResponse),
      });
    }
    return errorResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  if (adminEmail && normalizeEmail(user?.email) !== adminEmail) {
    const errorResponse = oauthErrorRedirect(request);
    if (process.env.NODE_ENV !== "production") {
      console.log("[auth-debug:callback]", {
        host: requestUrl.host,
        hasCode: true,
        exchangeSucceeded: true,
        setCookieCount: getSetCookieCount(errorResponse),
      });
    }
    return errorResponse;
  }

  if (user) {
    try {
      await ensureProfile(supabase, user);
    } catch {
      // Best-effort only, never block successful auth redirect.
    }
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("[auth-debug:callback]", {
      host: requestUrl.host,
      hasCode: true,
      exchangeSucceeded: true,
      setCookieCount: getSetCookieCount(response),
      callbackOrigin: origin,
      redirectHost: successRedirect.host,
    });
  }

  return response;
}
