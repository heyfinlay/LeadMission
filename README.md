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

## OAuth Configuration Checklist

Supabase (Auth -> URL Configuration):

- Site URL: `https://lead-mission.vercel.app`
- Additional Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `https://lead-mission.vercel.app/auth/callback`

Discord Developer Portal (OAuth2 Redirects):

- `http://localhost:3000/auth/callback`
- `https://lead-mission.vercel.app/auth/callback`

Vercel environment variables:

- `NEXT_PUBLIC_SITE_URL=https://lead-mission.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

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

## Data persistence notes

- Persistence is local-first via IndexedDB (Dexie) in `src/data/local`.
- Repo contracts are defined in `src/data/repos/contracts.ts` and are Supabase-ready by interface design.
- Schema versioning is tracked with `meta.schemaVersion` and applied through `runMigrations()` in `src/data/local/migrations.ts`.
- Demo seed data is inserted once on first run by `seedDemoData()` in `src/data/local/seed.ts`.
- IDs are deterministic ULIDs generated in `src/lib/id.ts`.
- Settings page supports JSON export for leads/tasks/touchpoints/full snapshot.
