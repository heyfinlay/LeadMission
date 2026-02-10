import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();

  const redirectUrl = new URL("/login", request.url);
  return NextResponse.redirect(redirectUrl);
}
