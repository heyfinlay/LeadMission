# TU Lead Command Center (MVP v0.1)

## Run locally

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

Optional checks:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Deploy to Vercel

- Framework Preset: `Next.js`
- Root Directory: `.`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

Optional environment variables:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
ADMIN_EMAIL=
```

## Discord OAuth Setup (Supabase + Next.js)

### 1) Required environment variables

Set these locally in `.env.local` and in your deployment environment:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=
```

`NEXT_PUBLIC_SITE_URL` should match the active host exactly:

- local development: `http://localhost:3000`
- production: `https://lead-mission.vercel.app`

### 2) Supabase dashboard settings

In `Authentication -> Providers -> Discord`:

- Enable Discord provider.
- Copy the Supabase redirect URL shown there (it looks like `https://<project-ref>.supabase.co/auth/v1/callback`).

In `Authentication -> URL Configuration`:

- Site URL: your production app URL (`https://lead-mission.vercel.app`).
- Additional Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://lead-mission.vercel.app/auth/callback`

### 3) Discord Developer Portal settings

In your Discord app (`OAuth2 -> Redirects`), add the Supabase callback URL exactly as shown in Supabase provider settings:

- `https://<project-ref>.supabase.co/auth/v1/callback`

> Important: Discord should redirect back to Supabase's callback URL, not directly to your Next.js `/auth/callback` route.

### 4) In-app flow used by this repo

1. `/login` button sends the browser to `/auth/login?provider=discord&next=...`.
2. `/auth/login` starts `signInWithOAuth` server-side and redirects to Discord.
3. Discord returns to Supabase callback.
4. Supabase returns to app `/auth/callback?code=...`.
5. `/auth/callback` exchanges code for session, sets auth cookies, and redirects to `next` (defaults to `/dashboard`).

### 5) If login fails, where to look

- UI now surfaces a readable error plus metadata on `/login`:
  - `error` (human-readable)
  - `error_code` / `error_status` when available
  - `request_id` for log correlation
- Inspect server logs for structured `[auth]` events:
  - `oauth_sign_in_start`
  - `oauth_sign_in_result`
  - `oauth_callback_entry`
  - `oauth_code_exchange_result`
  - `oauth_callback_redirect_success`

### 6) Quick verification

1. Visit `/login` and click **Continue with Discord**.
2. Complete OAuth and confirm final redirect lands on `/dashboard`.
3. Refresh `/dashboard` and confirm you remain authenticated.
4. Hit `/api/me` and confirm `authenticated: true`.

Vercel environment variables:

- `NEXT_PUBLIC_SITE_URL=https://lead-mission.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

## Known-Good Auth Setup

Required env vars (local + prod):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; not required for OAuth callback exchange)

Optional server fallbacks:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Supabase Dashboard:

- Auth -> URL Configuration:
  - Redirect allowlist includes:
    - `http://localhost:3000/auth/callback`
    - `https://lead-mission.vercel.app/auth/callback`

Discord Developer Portal:

- OAuth2 Redirects include your Supabase callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`).

## Environment

Use these keys in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Optional:

```bash
ADMIN_EMAIL=
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are accepted as legacy fallbacks on the server, but the canonical keys are the `NEXT_PUBLIC_*` values above.

## Security Notes

- `.env.local` is gitignored. Do not commit secrets.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never expose it in client-side code or bundles.
- If `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` is exposed, rotate it immediately in the provider dashboard.

## Auth Smoke Test

1. Visit `/login` and click `Continue with Discord`.
2. Complete Discord OAuth and confirm the flow lands on `/auth/callback`, then redirects to `/dashboard`.
3. Navigate across protected pages (`/dashboard`, `/companies`, `/tasks`) and confirm the session remains active.
4. Refresh `/dashboard` and verify the session persists.
5. Sign out and confirm protected routes (`/dashboard`, `/leads`, `/tasks`, `/companies/*`) redirect to `/login`.
6. Repeat the same flow on `https://lead-mission.vercel.app`.

## Migration + Deploy Steps

```bash
supabase db push
```

After migration push completes, trigger a Vercel redeploy for `lead-mission.vercel.app`.

Profile onboarding note:

- On first successful OAuth callback, the app auto-upserts `public.profiles` for the authenticated user.
- Profile fields are sourced from Supabase `user_metadata` and OAuth identity data.

## Troubleshooting Auth Cookies

- When testing locally, do not set `NEXT_PUBLIC_SITE_URL` to production; OAuth `redirectTo` uses `window.location.origin`.
- If `NEXT_PUBLIC_SITE_URL` is set in development, ensure it matches the current origin exactly.
- In Supabase Auth URL configuration, keep both callback URLs:
  - `http://localhost:3000/auth/callback`
  - `https://lead-mission.vercel.app/auth/callback`
- After login, inspect the `/auth/callback` network response and confirm `Set-Cookie` headers are present.
- If `/auth/callback` has no `Set-Cookie`, the callback route is not returning the same response instance that received Supabase cookie writes.
- If session drops on route changes, enable temporary debug logs locally:
  - `DEBUG_AUTH=1 pnpm dev`
  - Check logs for route path, `hasSessionCookie`, and `hasUser` booleans.
- If login succeeds but API returns 401, sign out and log in again to refresh auth cookies.
- If you see `code challenge does not match previously saved code verifier`:
  - start login from `/login` on the same host+port used for callback
  - avoid multiple parallel login tabs/windows
  - retry once (callback now clears stale Supabase auth/verifier cookies on this failure path)
- If Discord OAuth sends you to Vercel (or any non-local host) instead of your app callback:
  - your Supabase redirect allowlist is missing the current callback URL
  - add `http://localhost:3000/auth/callback` to Supabase Additional Redirect URLs
  - make sure Discord redirects to Supabase callback only (`https://<project-ref>.supabase.co/auth/v1/callback`)

## Data persistence notes

- Persistence is local-first via IndexedDB (Dexie) in `src/data/local`.
- Repo contracts are defined in `src/data/repos/contracts.ts` and are Supabase-ready by interface design.
- Schema versioning is tracked with `meta.schemaVersion` and applied through `runMigrations()` in `src/data/local/migrations.ts`.
- Demo seed data is inserted once on first run by `seedDemoData()` in `src/data/local/seed.ts`.
- IDs are deterministic ULIDs generated in `src/lib/id.ts`.
- Settings page supports JSON export for leads/tasks/touchpoints/full snapshot.
