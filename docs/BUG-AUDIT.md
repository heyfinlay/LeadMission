# BUG TEST + SYSTEMS AUDIT

Date: 2026-02-10  
Workspace: `/Users/finlaysturzaker/Desktop/MissionControl`

Audit method:
1. Static repo-wide auth/config review.
2. Runtime smoke checks against local dev server (`/api/me`, `/auth/callback` without OAuth code).
3. Validation runs: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## 1) Current Behavior (repro steps)

Observed runtime baseline (unauthenticated state):
1. Start app and request `GET /api/me`.
2. Response is `200` with body `{"authenticated":false}`.
3. Request `GET /auth/callback` without query params.
4. Response is `307` redirect to `/login?error=oauth`.
5. Dev logs show:
   - `[auth-debug:middleware] pathname=/api/me hasSbCookie=false hasUser=false`
   - `[auth-debug:api-me] pathname=/api/me hasSbCookie=false hasUser=false`
   - `[auth-debug:callback] method=none exchangeSucceeded=false hasSbCookie=false hasUser=false setCookieCount=0`

User-reported symptom path to reproduce:
1. Open `/login`.
2. Click `Continue with Discord`.
3. Complete OAuth.
4. Session appears briefly, then `/api/me` shows unauthenticated and UI provider label can show `Unknown`.
5. Browser shows no `sb-*` auth cookies for the current host.

## 2) Architecture Map (auth flow diagram in text)

```text
Client (/login)
  -> DiscordLoginButton.signInWithOAuth(redirectTo=<site>/auth/callback)
     file: src/features/auth/discord-login-button.tsx

Supabase OAuth redirect
  -> /auth/callback
     -> createServerSupabaseClient()
     -> auth.exchangeCodeForSession(code)
     -> auth.getUser()
     -> redirect /dashboard
     file: app/auth/callback/route.ts

Request lifecycle after login
  Browser request
    -> middleware.ts -> updateSession()
       -> createServerClient(@supabase/ssr)
       -> auth.getUser() (refresh path)
       -> redirect to /login when protected+no user
       file: src/lib/supabase/middleware.ts

Session read in UI chip
  UserChip client component
    -> fetch /api/me
       -> createServerSupabaseClient()
       -> auth.getUser()
       -> JSON { authenticated, userId, provider }
       files: src/components/auth/UserChip.tsx, app/api/me/route.ts
```

## 3) Findings (ranked by impact)

### F1 (Critical): OAuth callback origin can diverge from the active host, causing host-scoped cookie loss
Evidence:
- `/Users/finlaysturzaker/Desktop/MissionControl/src/features/auth/discord-login-button.tsx:7`
- `/Users/finlaysturzaker/Desktop/MissionControl/src/features/auth/discord-login-button.tsx:24`
- `/Users/finlaysturzaker/Desktop/MissionControl/README.md:61`

What is happening:
- OAuth `redirectTo` is built from `NEXT_PUBLIC_SITE_URL` when present.
- If that value points to a different origin than the tab currently in use (for example production URL while testing on localhost or a Vercel preview URL), callback and cookie-setting happen on the other origin.
- Result: no auth cookies visible on the original host.

Reproduction steps:
1. Set `NEXT_PUBLIC_SITE_URL` to origin A.
2. Open app on origin B.
3. Trigger Discord login.
4. OAuth callback lands on origin A.
5. Inspect origin B cookies; no `sb-*` auth cookies present.

### F2 (High): Middleware requires `NEXT_PUBLIC_*` vars only, while server env logic supports fallback names
Evidence:
- `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/middleware.ts:62`
- `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/middleware.ts:65`
- `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/env.ts:72`
- `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/env.ts:73`
- `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/env.ts:95`
- `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/env.ts:98`

What is happening:
- Middleware short-circuits when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing.
- Other server-side paths allow fallback to `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- This creates split behavior: route handlers may work while middleware refresh/protection is disabled.

Reproduction steps:
1. Configure only `SUPABASE_URL`/`SUPABASE_ANON_KEY` (no `NEXT_PUBLIC_*`).
2. Start app.
3. Hit protected pages and `/api/me`.
4. Observe middleware not performing session refresh/protection as intended.

### F3 (High): Callback route depends on `getServerEnv()` (service-role required) even though OAuth exchange itself does not need service-role
Evidence:
- `/Users/finlaysturzaker/Desktop/MissionControl/app/auth/callback/route.ts:53`
- `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/env.ts:6`
- `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/env.ts:71`

What is happening:
- `/auth/callback` calls `getServerEnv()` to read `ADMIN_EMAIL`.
- `getServerEnv()` enforces `SUPABASE_SERVICE_ROLE_KEY` globally.
- Missing service-role key can break callback route before/around successful session finalization.

Reproduction steps:
1. Remove `SUPABASE_SERVICE_ROLE_KEY` from environment.
2. Hit `/auth/callback`.
3. Observe callback route error path instead of stable completion.

### F4 (Medium): `Unknown` provider label is a UI fallback, not definitive auth failure
Evidence:
- `/Users/finlaysturzaker/Desktop/MissionControl/src/components/auth/UserChip.tsx:33`
- `/Users/finlaysturzaker/Desktop/MissionControl/app/api/me/route.ts:39`
- `/Users/finlaysturzaker/Desktop/MissionControl/app/api/me/route.ts:46`

What is happening:
- `UserChip` renders `Unknown` when `provider` is null.
- `/api/me` only returns minimal identity fields; if provider is absent/null in current payload, UI reads `Unknown`.
- This can appear even when `authenticated: true`.

Reproduction steps:
1. Request `/api/me` for a user payload missing provider metadata.
2. Load shell header.
3. Observe provider label `Unknown`.

### F5 (Low): Secondary email-OTP route exists alongside Discord OAuth path
Evidence:
- `/Users/finlaysturzaker/Desktop/MissionControl/app/auth/login/route.ts:44`
- `/Users/finlaysturzaker/Desktop/MissionControl/app/login/page.tsx:23`

What is happening:
- `/auth/login` implements email OTP.
- `/login` UI currently uses Discord OAuth only.
- Keeping unused parallel auth route increases surface area and troubleshooting ambiguity.

Reproduction steps:
1. Inspect `/login` flow (Discord only).
2. Inspect `/auth/login` route handler (email OTP flow still active).
3. Confirm two auth patterns are present in codebase.

### F6 (Resolved during audit): Missing callback diagnostics for exchange success + `Set-Cookie` count
Evidence:
- `/Users/finlaysturzaker/Desktop/MissionControl/app/auth/callback/route.ts:32`
- `/Users/finlaysturzaker/Desktop/MissionControl/app/auth/callback/route.ts:41`
- `/Users/finlaysturzaker/Desktop/MissionControl/app/auth/callback/route.ts:124`
- `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/middleware.ts:92`
- `/Users/finlaysturzaker/Desktop/MissionControl/app/api/me/route.ts:20`

What changed:
- Added dev-only callback log fields: `method`, `exchangeSucceeded`, `hasSbCookie`, `hasUser`, `setCookieCount`.
- Aligned middleware and `/api/me` logs to `hasSbCookie` key.

Reproduction steps:
1. Run app in development mode.
2. Hit `/api/me` and `/auth/callback`.
3. Confirm log lines include requested boolean fields and cookie-count metric.

## 4) Root Cause(s)

Primary root cause:
1. Cross-origin OAuth callback risk from `NEXT_PUBLIC_SITE_URL`-driven `redirectTo` in the client login button (`src/features/auth/discord-login-button.tsx`). This is the strongest direct explanation for “no auth cookies visible” on the host where the user initiated login.

Contributing causes:
1. Env strategy inconsistency between middleware and other server auth paths (`src/lib/supabase/middleware.ts` vs `src/lib/env.ts`) creates deployment-dependent behavior.
2. Callback route env coupling to service-role requirement increases fragility.
3. UI fallback label `Unknown` can be misread as hard auth failure and obscures diagnosis.

## 5) Fix Plan (Phase 0/1/2)

### Phase 0 (Immediate, no architecture rewrite)
1. Enforce environment parity by host:
   - Local: `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
   - Production: `NEXT_PUBLIC_SITE_URL=https://lead-mission.vercel.app`
   - Do not point one host at another for interactive login testing.
2. Verify Supabase Auth URL config:
   - Site URL set correctly.
   - Redirect URLs include:
     - `http://localhost:3000/auth/callback`
     - `https://lead-mission.vercel.app/auth/callback`
3. Verify Discord OAuth redirect URLs match exactly (same two callback URLs).
4. Keep dev instrumentation enabled while validating login (`hasSbCookie`, `hasUser`, `exchangeSucceeded`, `setCookieCount`).

### Phase 1 (Code hardening)
1. Make OAuth redirect target origin-safe:
   - Prefer `window.location.origin` for interactive browser OAuth callback generation.
   - Keep optional explicit override only when intentionally needed.
   - File: `/Users/finlaysturzaker/Desktop/MissionControl/src/features/auth/discord-login-button.tsx`.
2. Unify env resolution in middleware with same fallback strategy used elsewhere.
   - File: `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/middleware.ts`.
3. Decouple callback from service-role requirement.
   - Read only `ADMIN_EMAIL` in callback route, avoid full `getServerEnv()` requirement there.
   - File: `/Users/finlaysturzaker/Desktop/MissionControl/app/auth/callback/route.ts`.
4. Clarify `/api/me` output for UI consistency.
   - Return explicit `provider` fallback or adjust chip copy when unauthenticated.
   - Files: `/Users/finlaysturzaker/Desktop/MissionControl/app/api/me/route.ts`, `/Users/finlaysturzaker/Desktop/MissionControl/src/components/auth/UserChip.tsx`.

### Phase 2 (Minimal known-good target architecture)
Target: Next App Router + `@supabase/ssr` + middleware refresh + callback exchange.

Files that should exist as canonical auth surface:
1. `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/browser.ts`
2. `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/server.ts`
3. `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/middleware.ts`
4. `/Users/finlaysturzaker/Desktop/MissionControl/middleware.ts`
5. `/Users/finlaysturzaker/Desktop/MissionControl/app/auth/callback/route.ts`
6. `/Users/finlaysturzaker/Desktop/MissionControl/app/api/me/route.ts`
7. `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/auth.ts`

Files to delete or merge:
1. Delete `/Users/finlaysturzaker/Desktop/MissionControl/app/auth/login/route.ts` if email OTP is not part of supported auth.
2. Merge/remove `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/client.ts` alias if not needed (it currently only re-exports browser client).

## 6) Verification Checklist

Auth cookie persistence checks:
1. In browser DevTools, inspect cookies for the exact active host:
   - Local: `http://localhost:3000`
   - Production: `https://lead-mission.vercel.app`
2. Expect Supabase cookies named with `sb-` prefix and `auth-token`/`refresh-token` segments (exact suffix can vary by project and chunking).
3. In Network tab, inspect `/auth/callback` response headers and confirm `Set-Cookie` is present.
4. Confirm middleware logs for protected routes show:
   - `hasSbCookie=true`
   - `hasUser=true`
5. Confirm `/api/me` returns `authenticated:true` after callback and refresh.
6. Refresh protected pages (`/dashboard`, `/companies`, `/tasks`) and confirm session remains.

Supabase + Discord dashboard checks:
1. Supabase Auth -> Providers -> Discord: enabled with valid client id/secret.
2. Supabase Auth -> URL config:
   - Site URL correct for environment.
   - Redirect URLs include both localhost and production callback URLs.
3. Discord Developer Portal OAuth2:
   - Redirect URLs exactly match Supabase callback URLs (character-for-character).

Deployment sanity (Vercel):
1. Root directory is project root (`.`) and `package.json` is detected.
2. Next.js dependency is present (`next` in `/Users/finlaysturzaker/Desktop/MissionControl/package.json:31`).
3. Vercel env var names match code expectations:
   - Required runtime auth keys: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`
   - Server-side keys as used by code paths: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`/`SUPABASE_ANON_KEY` fallback behavior.

## 7) Appendix: file inventory + relevant snippets

Auth file inventory:
1. `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/browser.ts` - browser Supabase client (`createBrowserClient`).
2. `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/server.ts` - server Supabase client (`createServerClient`) + cookie adapter.
3. `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/middleware.ts` - session refresh + route gating.
4. `/Users/finlaysturzaker/Desktop/MissionControl/middleware.ts` - matcher wiring.
5. `/Users/finlaysturzaker/Desktop/MissionControl/app/auth/callback/route.ts` - OAuth code exchange and callback redirect.
6. `/Users/finlaysturzaker/Desktop/MissionControl/app/api/me/route.ts` - auth status endpoint used by `UserChip`.
7. `/Users/finlaysturzaker/Desktop/MissionControl/src/components/auth/UserChip.tsx` - client auth status indicator.
8. `/Users/finlaysturzaker/Desktop/MissionControl/src/features/auth/discord-login-button.tsx` - OAuth start point and callback URL generation.
9. `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/auth.ts` - page/API auth guards.
10. `/Users/finlaysturzaker/Desktop/MissionControl/app/logout/route.ts` - explicit sign-out path.

Relevant snippet references:
1. Middleware matcher includes protected pages + `/api/me`: `/Users/finlaysturzaker/Desktop/MissionControl/middleware.ts:9`.
2. Middleware refresh/cookie-write path: `/Users/finlaysturzaker/Desktop/MissionControl/src/lib/supabase/middleware.ts:71`.
3. Callback exchange and diagnostics: `/Users/finlaysturzaker/Desktop/MissionControl/app/auth/callback/route.ts:106`.
4. `/api/me` auth read + debug logs: `/Users/finlaysturzaker/Desktop/MissionControl/app/api/me/route.ts:13`.
5. Client OAuth `redirectTo` construction: `/Users/finlaysturzaker/Desktop/MissionControl/src/features/auth/discord-login-button.tsx:24`.

Test evidence:
1. `pnpm typecheck` passed.
2. `pnpm lint` passed.
3. `pnpm test` passed (7 tests).
