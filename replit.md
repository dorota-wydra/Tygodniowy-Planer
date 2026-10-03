# Mój planer treningów

Polski tygodniowy planer treningów — React+Vite PWA z synchronizacją między urządzeniami.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/trening run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — session signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, Tailwind CSS, shadcn/ui, Framer Motion, @dnd-kit
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Auth: Replit Auth (`@workspace/replit-auth-web` client, `@workspace/replit-auth` server)
- Validation: Zod **v3** (`import { z } from "zod"` — NOT `zod/v4`)
- Build: esbuild (CJS bundle for server)

## Where things live

- `artifacts/trening/` — React+Vite frontend
  - `src/types/appData.ts` — unified `AppData` type, `SyncState`, API shapes, `SCHEMA_VERSION=2`
  - `src/schemas/appDataSchemas.ts` — Zod schemas, `safeParse`, `parseOrDefault`
  - `src/data/defaultAppData.ts` — `createDefaultAppData()`, `now()`
  - `src/data/migrations.ts` — `migrateAppData()`, `migrateFromOldLocalStorageKeys()`, `pickNewer()`
  - `src/services/localDataStorage.ts` — localStorage read/write with migration on first access
  - `src/services/dataApi.ts` — `fetchServerData()`, `putServerData()` (handles 409 conflict)
  - `src/hooks/useAppData.ts` — central data hook (localStorage + debounced server sync)
  - `src/components/SyncStatus.tsx` — sync indicator UI
  - `src/pages/Home.tsx` — main app shell, uses `useAppData`
  - `src/pages/SettingsTab.tsx` — settings + export/import backup section
- `artifacts/api-server/` — Express API
  - `src/routes/data.ts` — GET/PUT `/api/data` (v2 AppData + conflict detection)
- `lib/db/src/schema/userdata.ts` — `user_data` table (`app_data JSONB`, `schema_version`, legacy v1 cols)

## Architecture decisions

- **Unified AppData model (SCHEMA_VERSION=2):** all user data in one document stored in `localStorage` key `planer-app-data` and server column `app_data JSONB`. Replaces 10+ separate localStorage keys.
- **Last-write-wins sync:** `updatedAt` ISO timestamp on every AppData. On login, local vs server compared, newer wins. On PUT conflict (409), `pickNewer()` resolves via `updatedAt`.
- **Debounced server sync:** `useAppData` writes localStorage immediately, schedules server PUT after 1s idle. Online/offline detection triggers re-sync on reconnect.
- **Zod v3 import:** catalog pins `zod@^3.25.x` — always `import { z } from "zod"`, never `zod/v4`.
- **`safeParse` generic:** uses `<S extends z.ZodTypeAny>` + `z.output<S>` to correctly resolve Zod's output (not input) type for schemas with `.default()` fields.
- **Legacy migration:** `migrateFromOldLocalStorageKeys()` runs once, backed up to `planer-pre-migration-backup-v1`. Server v1 format (flat `currentWorkouts` etc.) converted by `migrateFromServerV1()`.

## Product

- Weekly workout planner with drag-and-drop scheduling across days
- Training programs with cycles, weeks, goals and auto-loading into current week
- History with weekly reflections, star ratings, notes
- Training data tracker (measurements, exercises)
- Notes, timer, reminder notifications (PWA)
- Cloud sync across devices (requires login via Replit Auth)
- Export/import JSON backup

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Never use `console.log` in server code** — use `req.log` / `logger` singleton
- **Always run `pnpm --filter @workspace/db run push` after schema changes** before testing API
- **Zod import:** `import { z } from "zod"` only — workspace catalog is v3.25.x, not v4
- **`safeParse` signature:** must use `<S extends z.ZodTypeAny>` + `z.output<S>`, not `<T>(schema: z.ZodType<T>)` — the latter loses output type correctness for schemas with `.default()`
- **Port for proxy:** always access via `localhost:80/<path>`, never direct service ports

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
