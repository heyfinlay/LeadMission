import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/auth";

const loginSchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
  company_website: z.string().max(0).optional(),
});

const sanitizeNext = (value?: string): string => {
  if (!value) {
    return "/companies";
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/companies";
  }

  return value;
};

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const raw = {
    email: String(formData.get("email") || ""),
    next: String(formData.get("next") || ""),
    company_website: String(formData.get("company_website") || ""),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("error", "Invalid login form input.");
    return NextResponse.redirect(redirectUrl);
  }

  const next = sanitizeNext(parsed.data.next);
  const supabase = await createServerAuthClient();

  const callbackUrl = new URL("/auth/callback", request.url);
  callbackUrl.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  const redirectUrl = new URL("/login", request.url);
  if (error) {
    redirectUrl.searchParams.set("error", error.message);
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set("sent", "1");
  redirectUrl.searchParams.set("email", parsed.data.email);
  redirectUrl.searchParams.set("next", next);

  return NextResponse.redirect(redirectUrl);
}

