import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/api/rate-limit";

const getClientIp = (request: NextRequest): string => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
};

export const enforceRateLimit = (
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
): NextResponse | null => {
  const ip = getClientIp(request);
  const result = rateLimit({
    key: `${scope}:${ip}`,
    limit,
    windowMs,
  });

  if (result.allowed) {
    return null;
  }

  const retryAfterSeconds = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));

  return NextResponse.json(
    {
      error: "Too many requests. Please try again shortly.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
};

