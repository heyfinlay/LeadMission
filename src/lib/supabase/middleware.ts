import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSessionCookie, logAuthDebug } from "@/lib/supabase/debug";
import type { Database } from "@/types/supabase";

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

const isPrefetchRequest = (request: NextRequest): boolean => {
  return request.headers.get("purpose") === "prefetch" || request.headers.has("next-router-prefetch");
};

interface CookieToSet {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
}

export const updateSession = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const isProtected = isProtectedRoute(pathname);
  const isPrefetch = isPrefetchRequest(request);

  // Defensive fallback: if OAuth returns to root, forward into the callback handler.
  if (pathname === "/" && (request.nextUrl.searchParams.has("code") || request.nextUrl.searchParams.has("token_hash"))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/callback";
    return NextResponse.redirect(redirectUrl);
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  const pendingCookies = new Map<string, CookieToSet>();
  const applyCookies = (response: NextResponse) => {
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  };

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

  const { data, error } = await supabase.auth.getUser();
  const hasUser = Boolean(data?.user && !error);
  const hasCookie = hasSessionCookie(request.cookies.getAll());

  logAuthDebug("middleware", {
    route: pathname,
    hasSessionCookie: hasCookie,
    hasUser,
    isProtected,
    isPrefetch,
  });

  if (isPrefetch) {
    return applyCookies(NextResponse.next({ request }));
  }

  if (!hasUser && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    const redirectPath = `${pathname}${request.nextUrl.search}`;
    redirectUrl.searchParams.set("redirect", redirectPath);
    redirectUrl.searchParams.set("next", redirectPath);
    return applyCookies(NextResponse.redirect(redirectUrl));
  }

  if (hasUser && pathname === "/login") {
    const requestedNext =
      sanitizeNext(request.nextUrl.searchParams.get("redirect")) ??
      sanitizeNext(request.nextUrl.searchParams.get("next"));
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = requestedNext || "/dashboard";
    redirectUrl.searchParams.delete("next");
    redirectUrl.searchParams.delete("redirect");
    return applyCookies(NextResponse.redirect(redirectUrl));
  }

  return applyCookies(NextResponse.next({ request }));
};
