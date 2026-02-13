import { NextResponse, type NextRequest } from "next/server";
import { ensureProfile } from "@/lib/profile/ensureProfile";
import {
  appendAuthErrorToUrl,
  buildAuthRequestContext,
  buildUiAuthError,
  getSetCookieCount,
  logAuthEvent,
  serializeSupabaseError,
} from "@/lib/supabase/auth-observability";
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

const hasCodeVerifierCookie = (request: NextRequest): boolean => {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.endsWith("-auth-token-code-verifier"));
};

const isPkceMismatchError = (error: ReturnType<typeof serializeSupabaseError>): boolean => {
  const message = error?.message?.toLowerCase() ?? "";
  const code = String(error?.code ?? "").toLowerCase();
  return (
    message.includes("code challenge does not match previously saved code verifier") ||
    message.includes("code verifier") ||
    code.includes("code_verifier")
  );
};

const clearSupabaseAuthCookies = (request: NextRequest, response: NextResponse): string[] => {
  const removableCookieNames = request.cookies
    .getAll()
    .filter(
      ({ name }) =>
        name.startsWith("sb-") &&
        (name.includes("-auth-token.") || name.endsWith("-auth-token") || name.endsWith("-auth-token-code-verifier")),
    )
    .map(({ name }) => name);

  removableCookieNames.forEach((name) => {
    response.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  });

  return removableCookieNames;
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

const oauthErrorRedirect = (
  request: NextRequest,
  options: {
    requestId: string;
    message: string;
    code?: string | number | null;
    status?: number | null;
    description?: string | null;
  },
): NextResponse => {
  const { origin } = new URL(request.url);
  const redirectUrl = new URL(`${origin}/login`);
  appendAuthErrorToUrl(redirectUrl, {
    requestId: options.requestId,
    message: options.message,
    code: options.code,
    status: options.status,
    description: options.description,
  });
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set("x-auth-request-id", options.requestId);
  return response;
};

export async function GET(request: NextRequest) {
  const requestContext = buildAuthRequestContext(request, "/auth/callback");
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;
  const code = searchParams.get("code");
  const next = sanitizeNext(searchParams.get("next"));
  const oauthError = searchParams.get("error");
  const oauthErrorCode = searchParams.get("error_code");
  const oauthErrorDescription = searchParams.get("error_description");

  logAuthEvent("info", "oauth_callback_entry", requestContext, {
    hasCode: Boolean(code),
    next,
    hasOauthError: Boolean(oauthError || oauthErrorCode || oauthErrorDescription),
    oauthErrorCode,
    hasCodeVerifierCookie: hasCodeVerifierCookie(request),
  });

  const successRedirect = buildSuccessRedirect(request, next);
  const response = NextResponse.redirect(successRedirect);

  if (!code) {
    const mappedError = buildUiAuthError(requestContext, {
      fallback: "OAuth callback is missing the authorization code.",
      oauthCode: oauthErrorCode ?? oauthError,
      oauthDescription: oauthErrorDescription,
    });
    const errorResponse = oauthErrorRedirect(request, mappedError);
    logAuthEvent("warn", "oauth_callback_missing_code", requestContext, {
      next,
      oauthError,
      oauthErrorCode,
      oauthErrorDescription,
      setCookieCount: getSetCookieCount(errorResponse),
    });
    return errorResponse;
  }

  const supabase = createSupabaseRouteClient(request, response);
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  const serializedExchangeError = serializeSupabaseError(exchangeError);
  const exchangeSucceeded = !serializedExchangeError;

  logAuthEvent(exchangeSucceeded ? "info" : "error", "oauth_code_exchange_result", requestContext, {
    next,
    exchangeSucceeded,
    setCookieCount: getSetCookieCount(response),
    error: serializedExchangeError,
  });

  if (!exchangeSucceeded) {
    const mappedError = buildUiAuthError(requestContext, {
      fallback: "Could not complete sign-in. Please retry.",
      supabaseError: serializedExchangeError,
    });
    const errorResponse = oauthErrorRedirect(request, mappedError);
    const pkceMismatch = isPkceMismatchError(serializedExchangeError);
    const clearedCookieNames = pkceMismatch ? clearSupabaseAuthCookies(request, errorResponse) : [];
    logAuthEvent("error", "oauth_code_exchange_failed_redirect", requestContext, {
      next,
      error: serializedExchangeError,
      setCookieCount: getSetCookieCount(errorResponse),
      hasCodeVerifierCookie: hasCodeVerifierCookie(request),
      isPkceMismatch: pkceMismatch,
      clearedCookieCount: clearedCookieNames.length,
    });
    return errorResponse;
  }

  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();
  const serializedGetUserError = serializeSupabaseError(getUserError);
  logAuthEvent(serializedGetUserError ? "warn" : "info", "oauth_session_user_result", requestContext, {
    hasUser: Boolean(user),
    error: serializedGetUserError,
  });

  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  if (adminEmail && normalizeEmail(user?.email) !== adminEmail) {
    const errorResponse = oauthErrorRedirect(request, {
      requestId: requestContext.requestId,
      message: "Access not enabled for this account.",
      description: "Authenticated user is not in the ADMIN_EMAIL allowlist.",
    });
    logAuthEvent("warn", "oauth_allowlist_blocked", requestContext, {
      next,
      userEmail: normalizeEmail(user?.email),
      setCookieCount: getSetCookieCount(errorResponse),
    });
    return errorResponse;
  }

  if (user) {
    try {
      await ensureProfile(supabase, user);
    } catch {
      // Best-effort only, never block successful auth redirect.
    }
  }

  logAuthEvent("info", "oauth_callback_redirect_success", requestContext, {
    next,
    setCookieCount: getSetCookieCount(response),
    callbackOrigin: origin,
    redirectHost: successRedirect.host,
  });

  response.headers.set("x-auth-request-id", requestContext.requestId);
  return response;
}
