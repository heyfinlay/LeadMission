import { NextResponse, type NextRequest } from "next/server";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { supabase, applyCookies } = createRouteHandlerSupabaseClient(request);

  await supabase.auth.signOut();

  const redirectUrl = new URL("/login", request.url);
  return applyCookies(NextResponse.redirect(redirectUrl));
}
