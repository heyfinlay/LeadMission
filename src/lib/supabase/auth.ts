import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/supabase";

export interface ApiAuthContext {
  supabase: SupabaseClient<Database>;
  user: User;
}

export const createServerAuthClient = async (): Promise<SupabaseClient<Database>> => {
  const cookieStore = await cookies();
  const env = getServerEnv();

  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Cookies can't always be set from Server Components.
        }
      },
    },
  });
};

export const getUser = async (): Promise<User | null> => {
  const supabase = await createServerAuthClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
};

export const requireUser = async (): Promise<User> => {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  return user;
};

export const requireApiUser = async (): Promise<ApiAuthContext | Response> => {
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return {
    supabase,
    user: data.user,
  };
};

