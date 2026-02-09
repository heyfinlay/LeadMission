import { NextResponse, type NextRequest } from "next/server";
import { createServerAuthClient } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const supabase = await createServerAuthClient();
  await supabase.auth.signOut();

  const redirectUrl = new URL("/login", request.url);
  return NextResponse.redirect(redirectUrl);
}

