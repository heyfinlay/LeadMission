import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
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

const normalizeEmail = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const redirectWithError = (request: NextRequest, message: string) => {
  const errorUrl = new URL("/login", request.url);
  errorUrl.searchParams.set("error", message);
  return NextResponse.redirect(errorUrl);
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNext(url.searchParams.get("next"));

  const supabase = await createServerAuthClient();
  const finalize = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return redirectWithError(request, "Could not complete login.");
    }

    const adminEmail = normalizeEmail(getServerEnv().ADMIN_EMAIL);
    if (adminEmail && normalizeEmail(data.user.email) !== adminEmail) {
      await supabase.auth.signOut();
      return redirectWithError(request, "Access not enabled.");
    }

    return NextResponse.redirect(new URL(next, request.url));
  };

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return finalize();
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return finalize();
    }
  }

  return redirectWithError(request, "Could not complete login.");
}
