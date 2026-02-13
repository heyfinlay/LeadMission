import type { AuthError } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";

type AuthLogLevel = "info" | "warn" | "error";

interface AuthLogContext {
  requestId: string;
  route: string;
  method: string;
  host: string;
  path: string;
}

interface AuthUiErrorOptions {
  message: string;
  requestId: string;
  code?: string | number | null;
  status?: number | null;
  description?: string | null;
}

interface SerializedSupabaseError {
  name: string | null;
  message: string | null;
  status: number | null;
  code: string | number | null;
}

const readString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const readCode = (value: unknown): string | number | null => {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return null;
};

const sanitizeMessage = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  return value.replace(/\s+/g, " ").trim() || null;
};

const resolveKnownAuthFailure = (message: string | null): string | null => {
  if (!message) {
    return null;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("redirect") || normalized.includes("redirect_uri") || normalized.includes("redirect_to")) {
    return "OAuth redirect mismatch. Verify Supabase redirect allowlist and Discord callback URLs include this /auth/callback host.";
  }

  if (
    normalized.includes("code challenge does not match previously saved code verifier") ||
    normalized.includes("code verifier") ||
    normalized.includes("bad_oauth_state") ||
    normalized.includes("flow state") ||
    normalized.includes("code challenge")
  ) {
    return "OAuth verification failed (PKCE mismatch). Restart login from /login on the same host, avoid parallel login tabs, and retry.";
  }

  if (normalized.includes("access denied")) {
    return "OAuth access was denied by the provider.";
  }

  return null;
};

export const buildAuthRequestContext = (request: NextRequest, route: string): AuthLogContext => {
  const requestIdHeader = request.headers.get("x-request-id");
  const requestId = readString(requestIdHeader) ?? crypto.randomUUID();

  return {
    requestId,
    route,
    method: request.method,
    host: request.nextUrl.host,
    path: request.nextUrl.pathname,
  };
};

export const serializeSupabaseError = (error: AuthError | null | undefined): SerializedSupabaseError | null => {
  if (!error) {
    return null;
  }

  const candidate = error as AuthError & {
    status?: number | string;
    code?: string | number;
  };

  return {
    name: readString(candidate.name),
    message: sanitizeMessage(candidate.message),
    status: readNumber(candidate.status),
    code: readCode(candidate.code),
  };
};

export const getSetCookieCount = (response: NextResponse): number => {
  const getSetCookie = response.headers.getSetCookie?.();
  if (getSetCookie && getSetCookie.length > 0) {
    return getSetCookie.length;
  }

  return response.headers.get("set-cookie") ? 1 : 0;
};

export const buildUiAuthError = (
  requestContext: AuthLogContext,
  options: {
    fallback: string;
    supabaseError?: SerializedSupabaseError | null;
    oauthCode?: string | null;
    oauthDescription?: string | null;
  },
): AuthUiErrorOptions => {
  const supabaseMessage = sanitizeMessage(options.supabaseError?.message);
  const oauthDescription = sanitizeMessage(options.oauthDescription);
  const knownFailure =
    resolveKnownAuthFailure(oauthDescription) ??
    resolveKnownAuthFailure(supabaseMessage) ??
    resolveKnownAuthFailure(readString(options.oauthCode));

  const message = knownFailure ?? oauthDescription ?? supabaseMessage ?? options.fallback;
  const code = options.supabaseError?.code ?? readCode(options.oauthCode);
  const status = options.supabaseError?.status ?? null;

  return {
    message,
    requestId: requestContext.requestId,
    code,
    status,
    description: oauthDescription ?? supabaseMessage,
  };
};

export const appendAuthErrorToUrl = (url: URL, error: AuthUiErrorOptions): URL => {
  url.searchParams.set("error", error.message);
  url.searchParams.set("request_id", error.requestId);

  if (error.code !== null && error.code !== undefined) {
    url.searchParams.set("error_code", String(error.code));
  }

  if (error.status !== null && error.status !== undefined) {
    url.searchParams.set("error_status", String(error.status));
  }

  const description = sanitizeMessage(error.description);
  if (description) {
    url.searchParams.set("error_description", description);
  }

  return url;
};

export const logAuthEvent = (
  level: AuthLogLevel,
  event: string,
  context: AuthLogContext,
  details: Record<string, unknown> = {},
) => {
  const payload = {
    event,
    requestId: context.requestId,
    route: context.route,
    method: context.method,
    host: context.host,
    path: context.path,
    ...details,
  };

  if (level === "error") {
    console.error("[auth]", payload);
    return;
  }

  if (level === "warn") {
    console.warn("[auth]", payload);
    return;
  }

  console.info("[auth]", payload);
};
