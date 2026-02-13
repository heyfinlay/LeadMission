import { NextResponse, type NextRequest } from "next/server";
import {
  appendAuthErrorToUrl,
  buildAuthRequestContext,
  buildUiAuthError,
  getSetCookieCount,
  logAuthEvent,
  serializeSupabaseError,
} from "@/lib/supabase/auth-observability";
import { copySupabaseCookies, createSupabaseRouteClient } from "@/lib/supabase/ssr";

const sanitizeNext = (value: string | null): string => {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
};

const clearStaleCodeVerifierCookies = (request: NextRequest, response: NextResponse): string[] => {
  const staleVerifierCookies = request.cookies
    .getAll()
    .filter(({ name }) => name.startsWith("sb-") && name.endsWith("-auth-token-code-verifier"))
    .map(({ name }) => name);

  staleVerifierCookies.forEach((name) => {
    response.cookies.set({
      name,
      value: "",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  });

  return staleVerifierCookies;
};

const buildLoginErrorRedirect = (
  request: NextRequest,
  requestId: string,
  errorOptions: {
    message: string;
    code?: string | number | null;
    status?: number | null;
    description?: string | null;
  },
): NextResponse => {
  const redirectUrl = new URL("/login", request.url);
  appendAuthErrorToUrl(redirectUrl, {
    message: errorOptions.message,
    requestId,
    code: errorOptions.code,
    status: errorOptions.status,
    description: errorOptions.description,
  });
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set("x-auth-request-id", requestId);
  return response;
};

const buildCallbackUrl = (request: NextRequest, next: string): URL => {
  const { origin } = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const inDev = process.env.NODE_ENV === "development";

  if (!inDev && forwardedHost) {
    const callbackUrl = new URL(`https://${forwardedHost}/auth/callback`);
    callbackUrl.searchParams.set("next", next);
    return callbackUrl;
  }

  const callbackUrl = new URL(`${origin}/auth/callback`);
  callbackUrl.searchParams.set("next", next);
  return callbackUrl;
};

export async function GET(request: NextRequest) {
  const requestContext = buildAuthRequestContext(request, "/auth/login");
  const provider = request.nextUrl.searchParams.get("provider")?.toLowerCase();
  const next = sanitizeNext(request.nextUrl.searchParams.get("next"));

  logAuthEvent("info", "oauth_sign_in_start", requestContext, {
    provider: provider ?? "unknown",
    next,
  });

  if (provider !== "discord") {
    const error = buildUiAuthError(requestContext, {
      fallback: "Only Discord login is currently enabled.",
    });
    return buildLoginErrorRedirect(request, requestContext.requestId, error);
  }

  const callbackUrl = buildCallbackUrl(request, next);
  const pendingResponse = NextResponse.next();
  const clearedVerifierCookies = clearStaleCodeVerifierCookies(request, pendingResponse);
  const supabase = createSupabaseRouteClient(request, pendingResponse);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: callbackUrl.toString(),
      scopes: "identify email",
    },
  });
  const serializedError = serializeSupabaseError(error);

  logAuthEvent(serializedError || !data?.url ? "error" : "info", "oauth_sign_in_result", requestContext, {
    provider,
    next,
    callbackUrl: callbackUrl.toString(),
    hasAuthUrl: Boolean(data?.url),
    setCookieCount: getSetCookieCount(pendingResponse),
    clearedVerifierCookieCount: clearedVerifierCookies.length,
    error: serializedError,
  });

  if (serializedError || !data?.url) {
    const mappedError = buildUiAuthError(requestContext, {
      fallback: "Unable to start Discord login.",
      supabaseError: serializedError,
    });
    return buildLoginErrorRedirect(request, requestContext.requestId, mappedError);
  }

  const oauthRedirect = NextResponse.redirect(data.url);
  const response = copySupabaseCookies(pendingResponse, oauthRedirect);
  response.headers.set("x-auth-request-id", requestContext.requestId);
  logAuthEvent("info", "oauth_sign_in_redirect", requestContext, {
    provider,
    next,
    callbackUrl: callbackUrl.toString(),
    redirectHost: new URL(data.url).host,
    setCookieCount: getSetCookieCount(response),
    clearedVerifierCookieCount: clearedVerifierCookies.length,
  });

  return response;
}
