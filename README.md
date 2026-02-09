# TU Lead Command Center (MVP v0.1)

## Run locally

```bash
npm install --cache /tmp/npm-cache
npm run dev
```

Then open `http://localhost:3000`.

Optional checks:

```bash
npm run lint
npm run test
```

## Data persistence notes

- Persistence is local-first via IndexedDB (Dexie) in `src/data/local`.
- Repo contracts are defined in `src/data/repos/contracts.ts` and are Supabase-ready by interface design.
- Schema versioning is tracked with `meta.schemaVersion` and applied through `runMigrations()` in `src/data/local/migrations.ts`.
- Demo seed data is inserted once on first run by `seedDemoData()` in `src/data/local/seed.ts`.
- IDs are deterministic ULIDs generated in `src/lib/id.ts`.
- Settings page supports JSON export for leads/tasks/touchpoints/full snapshot.
