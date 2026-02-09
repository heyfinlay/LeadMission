import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/auth";

const sanitizeNext = (value: string | null): string => {
  if (!value) {
    return "/companies";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/companies";
  }

  return value;
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeNext(url.searchParams.get("next"));

  const supabase = await createServerAuthClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const errorUrl = new URL("/login", request.url);
  errorUrl.searchParams.set("error", "Could not complete login.");
  return NextResponse.redirect(errorUrl);
}

