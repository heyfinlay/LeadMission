import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL."),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required."),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required."),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL on server) is required."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY on server) is required."),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type PublicEnv = z.infer<typeof publicEnvSchema>;

let serverEnvCache: ServerEnv | null = null;
let publicEnvCache: PublicEnv | null = null;

const formatZodError = (scope: "server" | "public", error: z.ZodError): never => {
  const details = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" | ");
  throw new Error(`Invalid ${scope} environment configuration. ${details}`);
};

export const getServerEnv = (): ServerEnv => {
  if (serverEnvCache) {
    return serverEnvCache;
  }

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  });

  if (!parsed.success) {
    return formatZodError("server", parsed.error);
  }

  serverEnvCache = parsed.data;
  return serverEnvCache;
};

export const getPublicEnv = (): PublicEnv => {
  if (publicEnvCache) {
    return publicEnvCache;
  }

  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? (typeof window === "undefined" ? process.env.SUPABASE_URL : undefined),
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      (typeof window === "undefined" ? process.env.SUPABASE_ANON_KEY : undefined),
  });

  if (!parsed.success) {
    return formatZodError("public", parsed.error);
  }

  publicEnvCache = parsed.data;
  return publicEnvCache;
};

