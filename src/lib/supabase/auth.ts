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

const normalizeEmail = (value: string | undefined | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized || null;
};

const isAllowlisted = (user: User): boolean => {
  const env = getServerEnv();
  const adminEmail = normalizeEmail(env.ADMIN_EMAIL);

  if (!adminEmail) {
    return true;
  }

  return normalizeEmail(user.email) === adminEmail;
};

const ensureAllowlisted = async (
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<boolean> => {
  if (isAllowlisted(user)) {
    return true;
  }

  await supabase.auth.signOut();
  return false;
};

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
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const allowlisted = await ensureAllowlisted(supabase, data.user);
  if (!allowlisted) {
    return null;
  }

  return data.user;
};

export const requireUser = async (): Promise<User> => {
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  const allowlisted = await ensureAllowlisted(supabase, data.user);
  if (!allowlisted) {
    redirect("/login?error=Access%20not%20enabled.");
  }

  return data.user;
};

export const requireApiUser = async (): Promise<ApiAuthContext | Response> => {
  const supabase = await createServerAuthClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowlisted = await ensureAllowlisted(supabase, data.user);
  if (!allowlisted) {
    return Response.json({ error: "Access not enabled." }, { status: 403 });
  }

  return {
    supabase,
    user: data.user,
  };
};
