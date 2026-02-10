const isAuthDebugEnabled = (): boolean =>
  process.env.NODE_ENV !== "production" && process.env.DEBUG_AUTH === "1";

interface CookieLike {
  name: string;
}

export const hasSessionCookie = (cookies: CookieLike[]): boolean =>
  cookies.some(
    (cookie) =>
      cookie.name.startsWith("sb-") &&
      (cookie.name.includes("auth-token") || cookie.name.includes("refresh-token")),
  );

interface AuthDebugPayload {
  route: string;
  hasSessionCookie: boolean;
  hasUser: boolean;
  isProtected?: boolean;
  isPrefetch?: boolean;
}

export const logAuthDebug = (scope: string, payload: AuthDebugPayload) => {
  if (!isAuthDebugEnabled()) {
    return;
  }

  const details = Object.entries(payload)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");

  console.info(`[auth-debug:${scope}] ${details}`);
};
