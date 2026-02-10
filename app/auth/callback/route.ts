import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/env";
import { createServerAuthClient } from "@/lib/supabase/auth";

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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createServerAuthClient();
  const finalize = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return redirectWithOauthError(request);
    }

    const adminEmail = normalizeEmail(getServerEnv().ADMIN_EMAIL);
    if (adminEmail && normalizeEmail(data.user.email) !== adminEmail) {
      await supabase.auth.signOut();
      return redirectWithOauthError(request);
    }

    return NextResponse.redirect(new URL("/dashboard", request.url));
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

  return redirectWithOauthError(request);
}
