import { NextResponse, type NextRequest } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/auth";

const sanitizeNext = (value: string | null): string => {
  if (!value) {
    return "/dashboard";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
};

const buildLoginErrorRedirect = (request: NextRequest, message: string): NextResponse => {
  const redirectUrl = new URL("/login", request.url);
  redirectUrl.searchParams.set("error", message);
  return NextResponse.redirect(redirectUrl);
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
  const provider = request.nextUrl.searchParams.get("provider")?.toLowerCase();
  const next = sanitizeNext(request.nextUrl.searchParams.get("next"));

  if (provider !== "discord") {
    return buildLoginErrorRedirect(request, "Only Discord login is currently enabled.");
  }

  const callbackUrl = buildCallbackUrl(request, next);

  const supabase = await createServerAuthClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: callbackUrl.toString(),
      scopes: "identify email",
    },
  });

  if (process.env.NODE_ENV !== "production") {
    console.info("[auth-debug:login]", {
      provider,
      next,
      callbackUrl: callbackUrl.toString(),
      hasAuthUrl: Boolean(data?.url),
      hasError: Boolean(error),
      error: error?.message,
    });
  }

  if (error || !data?.url) {
    return buildLoginErrorRedirect(request, error?.message ?? "Unable to start Discord login.");
  }

  return NextResponse.redirect(data.url);
}
