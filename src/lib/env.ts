import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL."),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) is required."),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required."),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email address.").optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_MODEL: z.string().min(1).optional(),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL is required."),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required."),
  NEXT_PUBLIC_SITE_URL: z.string().url("NEXT_PUBLIC_SITE_URL must be a valid URL."),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type PublicEnv = z.infer<typeof publicEnvSchema>;

let serverEnvCache: ServerEnv | null = null;
let publicEnvCache: PublicEnv | null = null;

const formatZodError = (scope: "server" | "public", error: z.ZodError): never => {
  const details = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(" | ");
  throw new Error(`Invalid ${scope} environment configuration. ${details}`);
};

const normalizeSiteUrl = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return undefined;
  }
};

const resolveSiteUrl = (): string => {
  const configuredSiteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (configuredSiteUrl) {
    return configuredSiteUrl;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const vercelUrl = normalizeSiteUrl(process.env.VERCEL_URL);
  if (vercelUrl) {
    return vercelUrl;
  }

  return "http://localhost:3000";
};

export const getServerEnv = (): ServerEnv => {
  if (serverEnvCache) {
    return serverEnvCache;
  }

  const parsed = serverEnvSchema.safeParse({
    SUPABASE_URL: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
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
    NEXT_PUBLIC_SITE_URL: resolveSiteUrl(),
  });

  if (!parsed.success) {
    return formatZodError("public", parsed.error);
  }

  publicEnvCache = parsed.data;
  return publicEnvCache;
};
