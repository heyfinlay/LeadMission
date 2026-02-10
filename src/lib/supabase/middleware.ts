import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware-client";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/companies",
  "/leads",
  "/tasks",
  "/settings",
  "/portal",
  "/app",
] as const;

const isProtectedRoute = (pathname: string): boolean => {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

const sanitizeNext = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
};

export const updateSession = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Defensive fallback: if OAuth returns to root, forward into the callback handler.
  if (pathname === "/" && (request.nextUrl.searchParams.has("code") || request.nextUrl.searchParams.has("token_hash"))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/callback";
    return NextResponse.redirect(redirectUrl);
  }

  const supabaseContext = createMiddlewareSupabaseClient(request);
  if (!supabaseContext) {
    return NextResponse.next({ request });
  }
  const { supabase, createResponse, applyCookies } = supabaseContext;
  const { data, error } = await supabase.auth.getUser();
  const isAuthenticated = Boolean(data?.user && !error);
  const isProtected = isProtectedRoute(pathname);

  if (!isAuthenticated && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return applyCookies(NextResponse.redirect(redirectUrl));
  }

  if (isAuthenticated && pathname === "/login") {
    const requestedNext = sanitizeNext(request.nextUrl.searchParams.get("next"));
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = requestedNext || "/dashboard";
    redirectUrl.searchParams.delete("next");
    return applyCookies(NextResponse.redirect(redirectUrl));
  }

  return applyCookies(createResponse());
};
